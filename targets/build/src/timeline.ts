// ── Timeline ───────────────────────────────────────────────────────────
// Each chapter is a script over its scroll progress p in [0, 1]. These
// functions turn p into what the chapter shows; the DOM code only applies
// the result. Pure: unit tested, and the same p always gives the same page.

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Progress of p through [start, end], clamped. */
export const span = (p: number, start: number, end: number) => clamp01((p - start) / (end - start));

// ── 01 · document: elements typed into <body> one after another ────────

export interface TypedNode {
  key: "h1" | "summary" | "now" | "nav";
  start: number;
  end: number;
}

export const DOC_NODES: readonly TypedNode[] = [
  { key: "h1", start: 0.08, end: 0.3 },
  { key: "summary", start: 0.34, end: 0.6 },
  { key: "now", start: 0.63, end: 0.76 },
  { key: "nav", start: 0.8, end: 0.94 },
];

export interface DocState {
  /** Characters (or, for nav, links) shown per node; -1 = not in the DOM yet. */
  shown: Record<TypedNode["key"], number>;
  /** The node being typed or last typed: where the caret and highlight sit. */
  active: TypedNode["key"] | null;
}

export function docState(p: number, lengths: Record<TypedNode["key"], number>): DocState {
  const shown = { h1: -1, summary: -1, now: -1, nav: -1 };
  let active: DocState["active"] = null;
  for (const n of DOC_NODES) {
    if (p < n.start || lengths[n.key] === 0) continue;
    shown[n.key] = Math.round(span(p, n.start, n.end) * lengths[n.key]);
    active = n.key;
  }
  return { shown, active };
}

// ── 02 · box model: padding, border, margin, radius scrubbed in ────────

export interface Scrub {
  prop: "padding" | "border-width" | "margin" | "border-radius";
  to: number;
  start: number;
  end: number;
  note: string;
}

export const BOX_SCRUBS: readonly Scrub[] = [
  { prop: "padding", to: 32, start: 0.1, end: 0.36, note: "padding grows inside the border; the content box keeps its width" },
  { prop: "border-width", to: 2, start: 0.42, end: 0.5, note: "the border sits between padding and margin" },
  { prop: "margin", to: 40, start: 0.55, end: 0.8, note: "margin pushes neighbours away; it is never painted" },
  { prop: "border-radius", to: 10, start: 0.84, end: 0.95, note: "radius clips the painted box, not the layout box" },
];

export interface BoxState {
  values: Record<Scrub["prop"], number>;
  /** The property moving now, or the last one that moved. */
  active: Scrub | null;
}

/** `scale` shrinks padding and margin on narrow screens; border and radius stay. */
export function boxState(p: number, scale = 1): BoxState {
  const values = { padding: 0, "border-width": 0, margin: 0, "border-radius": 0 };
  let active: Scrub | null = null;
  for (const s of BOX_SCRUBS) {
    const to = s.prop === "padding" || s.prop === "margin" ? Math.round(s.to * scale) : s.to;
    values[s.prop] = Math.round(span(p, s.start, s.end) * to);
    if (p >= s.start) active = s;
  }
  return { values, active };
}

// ── 03 · flex: one declaration at a time, items move between layouts ───

export interface DeclStep {
  at: number;
  /** Rule and property this step writes; the panel highlights it. */
  rule: "container" | "item";
  prop: string;
  value: string;
  note: string;
}
/** Kept for readability at the call sites. */
export type FlexStep = DeclStep;

export interface DeclState {
  /** Index of the last applied step, -1 for the starting display: block. */
  step: number;
  container: Record<string, string>;
  item: Record<string, string>;
  /** gap in px, scrubbed in over GAP_SCRUB of progress after its step. */
  gap: number;
}

const GAP_SCRUB = 0.1;

/** Applies every step at or before p; later steps win for the same property. */
export function declState(steps: readonly DeclStep[], p: number, gapPx: number): DeclState {
  const container: Record<string, string> = { display: "block" };
  const item: Record<string, string> = {};
  let step = -1;
  steps.forEach((s, i) => {
    if (p < s.at) return;
    (s.rule === "container" ? container : item)[s.prop] = s.value;
    step = i;
  });
  const g = steps.findIndex((s) => s.prop === "gap");
  const gap = g >= 0 && step >= g ? Math.round(span(p, steps[g]!.at, steps[g]!.at + GAP_SCRUB) * gapPx) : 0;
  if (g >= 0 && step >= g) container.gap = `${gap}px`;
  return { step, container, item, gap };
}

/** Keyboard stops: just past each step (a gap step once its scrub is done). */
function declStops(steps: readonly DeclStep[]): number[] {
  return [0, ...steps.map((s) => (s.prop === "gap" ? s.at + GAP_SCRUB : s.at) + 0.02)];
}

export const FLEX_STEPS: readonly DeclStep[] = [
  { at: 0.1, rule: "container", prop: "display", value: "flex", note: "children become flex items on one line; nothing wraps, so the row overflows" },
  { at: 0.24, rule: "container", prop: "flex-wrap", value: "wrap", note: "items that do not fit start a new flex line" },
  { at: 0.38, rule: "container", prop: "gap", value: "12px", note: "gap spaces items without margins on the edges" },
  { at: 0.52, rule: "container", prop: "justify-content", value: "center", note: "free space on each line is split to both ends" },
  { at: 0.66, rule: "container", prop: "justify-content", value: "space-between", note: "free space goes between items; the edges touch the container" },
  { at: 0.8, rule: "item", prop: "flex-grow", value: "1", note: "items grow to eat the free space; justify-content has nothing left to place" },
];

export const GAP_PX = 12;

export type FlexState = DeclState;

export function flexState(p: number): FlexState {
  return declState(FLEX_STEPS, p, GAP_PX);
}

// ── 04 · display: grid: tracks, gutters, explicit placement ─────────────

/** `cols` is the track count of the widest step: 3, or 2 on phones. */
export function gridSteps(cols: 2 | 3): readonly DeclStep[] {
  return [
    { at: 0.1, rule: "container", prop: "display", value: "grid", note: "one implicit column: nothing moves, but every item now sits in a row track" },
    { at: 0.22, rule: "container", prop: "grid-template-columns", value: "1fr 1fr", note: "two column tracks, each one fraction of the free space" },
    { at: 0.34, rule: "container", prop: "gap", value: "16px", note: "gutters between tracks, never on the outer edges" },
    cols === 3
      ? { at: 0.48, rule: "container", prop: "grid-template-columns", value: "repeat(3, 1fr)", note: "three tracks; the fourth item auto-places into the next row" }
      : { at: 0.48, rule: "container", prop: "grid-template-columns", value: "repeat(2, 1fr)", note: "the same two tracks, written with repeat()" },
    { at: 0.62, rule: "item", prop: "grid-column", value: "1 / -1", note: "line 1 to the last line: negative line numbers count from the end" },
    { at: 0.76, rule: "item", prop: "grid-row", value: "1", note: "pinned to row 1; the rest auto-flow after it. the featured project is this site, and you are inside it" },
  ];
}

export const GRID_GAP_PX = 16;

export interface GridState extends DeclState {
  /** Column tracks the template asks for (1 when there is none). */
  cols: number;
}

export function gridState(p: number, cols: 2 | 3 = 3): GridState {
  const s = declState(gridSteps(cols), p, GRID_GAP_PX);
  const template = s.container["grid-template-columns"] ?? "";
  const n = /repeat\((\d+)/.exec(template)?.[1];
  return { ...s, cols: n ? Number(n) : template ? template.split(/\s+/).length : 1 };
}

/** Scroll stops for keyboard stepping: just past each beat of a chapter. */
export const STOPS = {
  doc: [0, ...DOC_NODES.map((n) => n.end)],
  box: [0, ...BOX_SCRUBS.map((s) => s.end)],
  flex: declStops(FLEX_STEPS),
  grid: declStops(gridSteps(3)),
} as const;
