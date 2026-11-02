import { flexShading, gridLines, parseTracks, size, type Box } from "@/geometry";
import { h, mirror, offsetIn, place, px, tok } from "@/dom";
import { lede, type BuildModel, type Ref } from "@/model";
import { kb, ms as fmtMs, type Meter } from "@/meter";
import { BOX_SCRUBS, FLEX_STEPS, STOPS, boxState, docState, flexState, gridState, gridSteps, type DeclState, type DocState } from "@/timeline";

// ── Chapters ───────────────────────────────────────────────────────────
// Each chapter is a tall section with a sticky frame: the page being built
// on the left, a devtools panel on the right (below on phones), and an
// overlay layer drawn from real layout measurements. apply(p) renders the
// chapter at scroll progress p.

export interface Actions {
  focus(id: string): void;
  open(id: string): void;
  switchTarget(id: string): void;
}

export interface Chapter {
  key: "doc" | "box" | "flex" | "grid" | "end";
  /** Rail label. */
  label: string;
  /** Section height in viewports. */
  length: number;
  stops: readonly number[];
  section: HTMLElement;
  /** Render at progress p. `animate` is false under reduced motion and on resize. */
  apply(p: number, animate: boolean): void;
  /** Re-measure overlays (resize, fonts). */
  measure(): void;
  setFocus(id: string | null): void;
}

function frame(key: Chapter["key"], label: string) {
  const section = h("section", "ch");
  section.dataset.ch = key;
  section.setAttribute("aria-label", label);
  const page = h("div", "page");
  const ov = h("div", "ov");
  ov.setAttribute("aria-hidden", "true");
  const code = h("pre", "code");
  const note = h("p", "note");
  const perf = h("p", "perf");
  const tabs = h("div", "tabs", h("span", key === "doc" ? "tab on" : "tab", "Elements"), h("span", key === "doc" ? "tab" : "tab on", "Styles"));
  const panel = h("aside", "panel", tabs, code, note, perf);
  panel.setAttribute("aria-label", "devtools");
  section.append(h("div", "frame", page, panel));
  return { section, page, ov, code, note, panel, perf };
}

function tooltip(tag: string, cls: string, b: Box, extra = ""): HTMLElement {
  return h("span", "tip", h("b", "", tag), cls ? `.${cls}` : "", h("span", "dim", ` ${size(b.w, b.h)}${extra}`));
}

/** Above the box if there is room, else just inside its top edge. */
function placeTip(tip: HTMLElement, b: Box): void {
  const y = b.y >= 24 ? b.y - 22 : b.y + 2;
  tip.style.transform = `translate(${Math.round(b.x)}px, ${Math.round(y)}px)`;
}

/** CSS rules as panel lines; the declaration being changed is highlighted. Empty rules are left out. */
function ruleLines(rules: { sel: string; decls: Record<string, string>; on: string | null }[]): Node[] {
  const out: Node[] = [];
  for (const r of rules) {
    const entries = Object.entries(r.decls);
    if (!entries.length) continue;
    out.push(h("span", "ln", tok("sel", r.sel), " ", tok("punc", "{"), "\n"));
    for (const [prop, value] of entries)
      out.push(h("span", prop === r.on ? "ln on" : "ln", "  ", tok("prop", prop), tok("punc", ": "), tok("val", value), tok("punc", ";"), "\n"));
    out.push(h("span", "ln", tok("punc", "}"), "\n"));
  }
  return out;
}

/**
 * The meta line under each panel: what the step just applied cost in this
 * browser (writing the styles, the layout the overlay forced by measuring,
 * and drawing the overlay) and how many elements the frame has.
 */
function stamp(f: { page: HTMLElement; perf: HTMLElement }, t0: number, meter: Meter): void {
  const t = performance.now() - t0;
  meter.record(t);
  f.perf.replaceChildren(
    h("span", "k", "measured "),
    `last step ${fmtMs(t)}`,
    h("span", "dim", " (style, layout, overlay)"),
    ` · ${f.page.querySelectorAll("*").length} elements`,
  );
}

function markFocus(root: HTMLElement, id: string | null): void {
  for (const el of root.querySelectorAll<HTMLElement>("[data-id]")) el.classList.toggle("is-focus", el.dataset.id === id);
}

// ── 01 · <body> ────────────────────────────────────────────────────────

export function docChapter(model: BuildModel, act: Actions, meter: Meter, touch: boolean): Chapter {
  const f = frame("doc", "<body>");
  // Top-aligned: a centered body would move up with every line typed (layout shift).
  f.page.classList.add("top");
  const body = h("div", "body");
  const h1 = h("h1", "name");
  const summary = h("p", "summary");
  const now = h("p", "now");
  const nav = h("nav", "links");
  nav.setAttribute("aria-label", "sections");
  const links = model.sections.map((s) => {
    const a = h("a", "", s.label);
    a.href = `/node/${s.id}`;
    a.dataset.id = s.id;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      act.open(s.id);
    });
    return a;
  });
  const caret = h("span", "caret");
  caret.setAttribute("aria-hidden", "true");
  body.append(h1, summary, now, nav);
  // The hero is typed in as you scroll; assistive tech gets it whole, at once.
  for (const el of [h1, summary, now]) el.setAttribute("aria-hidden", "true");
  const spoken = h("div", "sr", h("h1", "", model.name), h("p", "", model.summary), model.now ? h("p", "", model.now) : null);
  // Until the first scroll: the page is empty on purpose, so say what moves it.
  const cue = h("p", "cue", h("span", "mouse"), h("span", "kw", touch ? "swipe up" : "scroll"), " to write this page", h("span", "sub", touch ? "it builds itself as you go" : "or press ↓ / space, one step at a time"));
  cue.setAttribute("aria-hidden", "true");
  f.page.append(spoken, body, f.ov, cue);

  const nodes = { h1, summary, now, nav } as const;
  const text = { h1: model.name, summary: model.summary, now: model.now, nav: "" };
  const lengths = { h1: text.h1.length, summary: text.summary.length, now: text.now.length, nav: links.length };
  const cls = { h1: "name", summary: "summary", now: "now", nav: "links" };
  const tag = { h1: "h1", summary: "p", now: "p", nav: "nav" };

  let last = "";
  let state: DocState = docState(0, lengths);

  const source = (s: DocState) => {
    const lines: Node[] = [];
    const line = (indent: number, ...parts: (Node | string)[]) => lines.push(h("span", "ln", "  ".repeat(indent), ...parts, "\n"));
    const open = (t: string, c: string): (Node | string)[] => [tok("punc", "<"), tok("tag", t), " ", tok("attr", "class"), tok("punc", "="), tok("str", `"${c}"`), tok("punc", ">")];
    const close = (t: string): Node[] => [tok("punc", "</"), tok("tag", t), tok("punc", ">")];
    line(0, tok("punc", "<"), tok("tag", "body"), tok("punc", ">"));
    for (const k of ["h1", "summary", "now"] as const) {
      if (s.shown[k] < 0) continue;
      const typing = s.active === k && s.shown[k] < lengths[k];
      line(1, ...open(tag[k], cls[k]), tok("txt", text[k].slice(0, s.shown[k])), ...(typing ? [h("span", "caret")] : close(tag[k])));
    }
    if (s.shown.nav >= 0) {
      line(1, ...open("nav", "links"));
      model.sections.slice(0, s.shown.nav).forEach((sec) => {
        line(2, tok("punc", "<"), tok("tag", "a"), " ", tok("attr", "href"), tok("punc", "="), tok("str", `"/node/${sec.id}"`), tok("punc", ">"), tok("txt", sec.label), ...close("a"));
      });
      line(1, ...close("nav"));
    }
    if (s.active === null) line(1, h("span", "caret"));
    line(0, ...close("body"));
    f.code.replaceChildren(...lines);
  };

  const measure = () => {
    const tips: Node[] = [];
    const bodyBox = offsetIn(body, f.page);
    const outline = h("div", "box-outline");
    place(outline, bodyBox);
    const label = h("span", "tip faint", h("b", "", "body"));
    placeTip(label, bodyBox);
    tips.push(outline, label);
    if (state.active) {
      const el = nodes[state.active];
      const b = offsetIn(el, f.page);
      const hl = h("div", "hl");
      place(hl, b);
      const tip = tooltip(tag[state.active], cls[state.active], b);
      placeTip(tip, b);
      tips.push(hl, tip);
    }
    f.ov.replaceChildren(...tips);
  };

  return {
    key: "doc",
    label: "<body>",
    length: 3.2,
    stops: STOPS.doc,
    section: f.section,
    apply(p) {
      state = docState(p, lengths);
      const key = JSON.stringify(state);
      if (key === last) return;
      last = key;
      const t0 = performance.now();
      for (const k of ["h1", "summary", "now"] as const) {
        nodes[k].hidden = state.shown[k] < 0;
        nodes[k].textContent = text[k].slice(0, Math.max(0, state.shown[k]));
      }
      nav.hidden = state.shown.nav < 0;
      nav.replaceChildren(...links.slice(0, Math.max(0, state.shown.nav)));
      const typing = state.active && state.active !== "nav" && state.shown[state.active] < lengths[state.active];
      if (typing && state.active) nodes[state.active].append(caret);
      else if (!state.active) body.append(caret);
      else caret.remove();
      f.note.textContent = state.active
        ? `/* <${tag[state.active]}> is in the DOM: ${state.active === "nav" ? "links, one per section of the tree" : "block-level, so it takes the full line"} */`
        : "/* an empty document. scroll to write it */";
      source(state);
      measure();
      stamp(f, t0, meter);
    },
    measure,
    setFocus: (id) => markFocus(nav, id),
  };
}

// ── 02 · box model ─────────────────────────────────────────────────────

export function boxChapter(model: BuildModel, meter: Meter, narrow: boolean): Chapter {
  const f = frame("box", "box model");
  const text = narrow ? lede(model.card.text, 120) : model.card.text;
  const card = h("article", "card", h("h2", "", model.card.title), h("p", "", text));
  card.dataset.id = model.card.id;
  const wrap = h("div", "boxwrap", h("div", "ghost"), card, h("div", "ghost"));
  f.page.append(wrap, f.ov);

  const diagram = h("div", "bm");
  f.panel.insertBefore(diagram, f.note);

  let last = "";
  const measure = () => {
    const cs = getComputedStyle(card);
    const side = (p: string) => [px(cs.getPropertyValue(`${p}-top`)), px(cs.getPropertyValue(`${p}-right`)), px(cs.getPropertyValue(`${p}-bottom`)), px(cs.getPropertyValue(`${p}-left`))] as const;
    const m = side("margin");
    const bw = [px(cs.borderTopWidth), px(cs.borderRightWidth), px(cs.borderBottomWidth), px(cs.borderLeftWidth)] as const;
    const pd = side("padding");
    const b = offsetIn(card, f.page);
    const ring = (cls: string, box: Box, w: readonly number[]) => {
      const el = h("div", `ring ${cls}`);
      place(el, box);
      el.style.borderWidth = w.map((n) => `${n}px`).join(" ");
      return el;
    };
    const marginBox = { x: b.x - m[3], y: b.y - m[0], w: b.w + m[1] + m[3], h: b.h + m[0] + m[2] };
    const paddingBox = { x: b.x + bw[3], y: b.y + bw[0], w: b.w - bw[1] - bw[3], h: b.h - bw[0] - bw[2] };
    const content = { x: paddingBox.x + pd[3], y: paddingBox.y + pd[0], w: paddingBox.w - pd[1] - pd[3], h: paddingBox.h - pd[0] - pd[2] };
    const fill = h("div", "ring content");
    place(fill, content);
    const tip = tooltip("article", "card", b);
    placeTip(tip, marginBox);
    f.ov.replaceChildren(ring("margin", marginBox, m), ring("border", b, bw), ring("padding", paddingBox, pd), fill, tip);

    // The devtools box-model diagram, with the same numbers.
    const level = (name: string, v: readonly number[], inner: Node) =>
      h("div", `lvl ${name}`, h("span", "k", name), h("span", "v t", String(v[0])), h("span", "v l", String(v[3])), inner, h("span", "v r", String(v[1])), h("span", "v b", String(v[2])));
    diagram.replaceChildren(level("margin", m, level("border", bw, level("padding", pd, h("div", "lvl c", size(content.w, content.h))))));
  };

  return {
    key: "box",
    label: "box model",
    length: 3,
    stops: STOPS.box,
    section: f.section,
    apply(p) {
      const s = boxState(p, narrow ? 0.5 : 1);
      const key = JSON.stringify(s.values);
      if (key === last) return;
      last = key;
      const t0 = performance.now();
      card.style.setProperty("--pad", `${s.values.padding}px`);
      card.style.setProperty("--bw", `${s.values["border-width"]}px`);
      card.style.setProperty("--mar", `${s.values.margin}px`);
      card.style.setProperty("--rad", `${s.values["border-radius"]}px`);

      const lines: Node[] = [h("span", "ln", tok("sel", ".card"), " ", tok("punc", "{"), "\n")];
      for (const sc of BOX_SCRUBS) {
        if (p < sc.start) continue;
        const v = `${s.values[sc.prop]}px${sc.prop === "border-width" ? " solid" : ""}`;
        const prop = sc.prop === "border-width" ? "border" : sc.prop;
        lines.push(h("span", sc === s.active ? "ln on" : "ln", "  ", tok("prop", prop), tok("punc", ": "), tok("val", v), tok("punc", ";"), "\n"));
      }
      lines.push(h("span", "ln", tok("punc", "}")));
      f.code.replaceChildren(...lines);
      f.note.textContent = s.active ? `/* ${s.active.note} */` : "/* an <article> with no box styles: content box only */";
      measure();
      stamp(f, t0, meter);
    },
    measure,
    setFocus: (id) => card.classList.toggle("is-focus", id === model.card.id),
  };
}

// ── 03 · display: flex ─────────────────────────────────────────────────

/** List items as the real (invisible) layout and the visible, clickable copies. */
function items<T extends Ref>(entries: readonly T[], act: Actions, inner: (e: T, tag: "span" | "button") => HTMLElement) {
  const ghosts = entries.map((e) => h("li", "", inner(e, "span")));
  const lives = entries.map((e) => {
    const b = inner(e, "button") as HTMLButtonElement;
    b.type = "button";
    b.dataset.id = e.id;
    b.addEventListener("click", () => act.focus(e.id));
    b.addEventListener("dblclick", () => act.open(e.id));
    return h("li", "", b);
  });
  return { ghosts, lives };
}

/** The container's content box in page coordinates. */
function contentBox(list: HTMLElement, page: HTMLElement, cs: CSSStyleDeclaration): { border: Box; content: Box } {
  const c = offsetIn(list, page);
  return {
    border: c,
    content: {
      x: c.x + list.clientLeft + px(cs.paddingLeft),
      y: c.y + list.clientTop + px(cs.paddingTop),
      w: list.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight),
      h: list.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom),
    },
  };
}

export function flexChapter(model: BuildModel, act: Actions, meter: Meter, max: number): Chapter {
  const f = frame("flex", "display: flex");
  f.page.classList.add("top");
  const list = h("ul", "skills");
  const { ghosts, lives } = items(model.flex.items.slice(0, max), act, (e, tag) => h(tag, "chip", e.label));
  list.append(...ghosts);
  const m = mirror(list, ghosts, lives);
  m.live.classList.add("skills-live");
  m.live.setAttribute("aria-label", model.flex.label);
  f.page.append(h("div", "flexwrap", list, m.live), f.ov);

  let lastStep = -2;
  let lastGap = -1;

  const measure = () => {
    const cs = getComputedStyle(list);
    const { border: c, content } = contentBox(list, f.page, cs);
    const flex = cs.display === "flex";
    const out: Node[] = [];
    const outline = h("div", flex ? "box-outline flex" : "box-outline");
    place(outline, c);
    out.push(outline);
    if (flex) {
      const shade = flexShading(content, ghosts.map((li) => offsetIn(li, f.page)), px(cs.columnGap));
      const hatch = (cls: string, b: Box) => {
        const el = h("div", `hatch ${cls}`);
        place(el, b);
        out.push(el);
      };
      for (const b of shade.free) hatch("free", b);
      for (const b of shade.gaps) hatch("gap", b);
      if (shade.overflow > 0) {
        hatch("over", { x: content.x + content.w, y: c.y, w: shade.overflow, h: c.h });
        const lbl = h("span", "tip warn", `overflow ${shade.overflow}px`);
        lbl.style.transform = `translate(${Math.round(content.x + content.w + 6)}px, ${Math.round(c.y + c.h + 6)}px)`;
        out.push(lbl);
      }
    }
    const tip = tooltip("ul", "skills", c, flex ? "  flex" : "");
    placeTip(tip, c);
    out.push(tip);
    f.ov.replaceChildren(...out);
  };

  const render = (s: DeclState) => {
    const active = FLEX_STEPS[s.step];
    f.code.replaceChildren(
      ...ruleLines([
        { sel: ".skills", decls: s.container, on: active?.rule === "container" ? active.prop : s.step < 0 ? "display" : null },
        { sel: ".skills > li", decls: s.item, on: active?.rule === "item" ? active.prop : null },
      ]),
    );
    f.note.textContent = active ? `/* ${active.note} */` : "/* list items are blocks: each takes a full line */";
  };

  return {
    key: "flex",
    label: "display: flex",
    length: 4.2,
    stops: STOPS.flex,
    section: f.section,
    apply(p, animate) {
      const s = flexState(p);
      if (s.step === lastStep && s.gap === lastGap) return;
      const t0 = performance.now();
      list.dataset.display = s.container.display ?? "block";
      list.dataset.wrap = s.container["flex-wrap"] ?? "nowrap";
      list.dataset.justify = s.container["justify-content"] ?? "normal";
      list.dataset.grow = s.item["flex-grow"] ?? "0";
      list.style.setProperty("--gap", `${s.gap}px`);
      m.sync(animate && lastStep !== -2);
      lastStep = s.step;
      lastGap = s.gap;
      render(s);
      measure();
      stamp(f, t0, meter);
    },
    measure() {
      m.sync(false);
      measure();
    },
    setFocus: (id) => markFocus(m.live, id),
  };
}

// ── 04 · display: grid ─────────────────────────────────────────────────

export function gridChapter(model: BuildModel, act: Actions, meter: Meter, narrow: boolean): Chapter {
  const f = frame("grid", "display: grid");
  f.page.classList.add("top");
  const cols = narrow ? 2 : 3;
  const steps = gridSteps(cols);
  const list = h("ul", "projects");
  const { ghosts, lives } = items(model.grid.items, act, (p, tag) =>
    h(tag, "proj", h("span", "title", p.label), h("span", "sum", p.summary), h("span", "stack", p.stack.join(" · "))),
  );
  model.grid.items.forEach((p, i) => {
    if (p.id !== model.grid.featured) return;
    ghosts[i]!.classList.add("featured");
    lives[i]!.classList.add("featured");
  });
  list.append(...ghosts);
  const m = mirror(list, ghosts, lives);
  m.live.setAttribute("aria-label", model.grid.label);
  f.page.append(h("div", "gridwrap", list, m.live), f.ov);

  let lastStep = -2;
  let lastGap = -1;

  const measure = () => {
    const cs = getComputedStyle(list);
    const { border: c, content } = contentBox(list, f.page, cs);
    const grid = cs.display === "grid";
    const out: Node[] = [];
    const outline = h("div", grid ? "box-outline grid" : "box-outline");
    place(outline, c);
    out.push(outline);
    if (grid) {
      const colSizes = parseTracks(cs.gridTemplateColumns);
      const g = gridLines(content, colSizes.length ? colSizes : [content.w], parseTracks(cs.gridTemplateRows), px(cs.columnGap), px(cs.rowGap));
      for (const b of g.gaps) {
        const el = h("div", "hatch track-gap");
        place(el, b);
        out.push(el);
      }
      const top = g.rows[0] ?? content.y;
      const bottom = g.rows.at(-1) ?? content.y + content.h;
      const left = g.cols[0] ?? content.x;
      const right = g.cols.at(-1) ?? content.x + content.w;
      const n = g.cols.length;
      g.cols.forEach((x, i) => {
        const line = h("div", "gline v");
        place(line, { x, y: top - 8, w: 0, h: bottom - top + 16 });
        const lbl = h("span", "gnum", String(i + 1));
        lbl.style.transform = `translate(${Math.round(x - 7)}px, ${Math.round(top - 26)}px)`;
        const neg = h("span", "gnum neg", String(i - n));
        neg.style.transform = `translate(${Math.round(x - 9)}px, ${Math.round(bottom + 10)}px)`;
        out.push(line, lbl, neg);
      });
      g.rows.forEach((y, i) => {
        const line = h("div", "gline h");
        place(line, { x: left - 8, y, w: right - left + 16, h: 0 });
        const lbl = h("span", "gnum", String(i + 1));
        lbl.style.transform = `translate(${Math.round(Math.max(2, left - 30))}px, ${Math.round(y - 7)}px)`;
        out.push(line, lbl);
      });
    }
    const tip = tooltip("ul", "projects", c, grid ? "  grid" : "");
    placeTip(tip, { ...c, y: c.y - (grid ? 22 : 0) });
    out.push(tip);
    f.ov.replaceChildren(...out);
  };

  const render = (s: DeclState) => {
    const active = steps[s.step];
    f.code.replaceChildren(
      ...ruleLines([
        { sel: ".projects", decls: s.container, on: active?.rule === "container" ? active.prop : s.step < 0 ? "display" : null },
        { sel: ".featured", decls: s.item, on: active?.rule === "item" ? active.prop : null },
      ]),
    );
    f.note.textContent = active ? `/* ${active.note} */` : "/* the projects, one block each */";
  };

  return {
    key: "grid",
    label: "display: grid",
    length: 4.2,
    stops: STOPS.grid,
    section: f.section,
    apply(p, animate) {
      const s = gridState(p, cols);
      if (s.step === lastStep && s.gap === lastGap) return;
      const t0 = performance.now();
      list.dataset.display = s.container.display ?? "block";
      list.dataset.cols = String(s.cols);
      list.dataset.span = s.item["grid-column"] ? "1" : "0";
      list.dataset.row = s.item["grid-row"] ? "1" : "0";
      list.style.setProperty("--gap", `${s.gap}px`);
      m.live.classList.toggle("placed", Boolean(s.item["grid-column"]));
      m.sync(animate && lastStep !== -2);
      lastStep = s.step;
      lastGap = s.gap;
      render(s);
      measure();
      stamp(f, t0, meter);
    },
    measure() {
      m.sync(false);
      measure();
    },
    setFocus: (id) => markFocus(m.live, id),
  };
}

// ── </body>: the page, measured, and the source it was compiled from ───

export function endChapter(model: BuildModel, act: Actions, meter: Meter, root: ShadowRoot): Chapter {
  const section = h("section", "ch end");
  section.dataset.ch = "end";
  section.setAttribute("aria-label", "</body>");

  const stats = h("dl", "stats");
  const row = (k: string, v: string, hint = "") => [h("dt", "", k), h("dd", "", v, hint ? h("span", "dim", ` ${hint}`) : "")];
  let lastRefresh = -Infinity;
  const refresh = () => {
    const now = performance.now();
    if (now - lastRefresh < 250) return;
    lastRefresh = now;
    const js = meter.script();
    const shift = meter.shift();
    stats.replaceChildren(
      ...(js ? row("script", kb(js.bytes), `compressed, ${js.files} files`) : []),
      ...row("elements", String(root.querySelectorAll("*").length), "in this shadow root"),
      ...row("layout work", fmtMs(meter.ms), `over ${meter.steps} step${meter.steps === 1 ? "" : "s"} (style, layout, overlay)`),
      ...(shift === null ? [] : row("layout shift", shift.toFixed(3), shift < 0.1 ? "since mount; good is under 0.1" : "since mount; good is under 0.1, this is not")),
      ...(meter.firstFrame === null ? [] : row("first frame", fmtMs(meter.firstFrame), "after mount")),
    );
  };

  // The source: an Elements-style view of the IR, one line per top-level node.
  const src = model.source;
  const attr = (k: string, v: string | number) => [" ", tok("attr", k), tok("punc", "="), tok("str", `"${v}"`)];
  const tree = h(
    "pre",
    "code tree",
    h("span", "ln", tok("punc", "<"), tok("tag", "ir"), ...attr("schema", src.schema), ...attr("entities", src.entities), ...attr("edges", src.edges), tok("punc", ">"), "\n"),
    h("span", "ln", "  ", tok("punc", "<"), tok("tag", "root"), ...attr("id", model.root), tok("punc", ">"), "\n"),
    ...src.sections.map((e) => {
      const b = h("button", "ln node", "    ", tok("punc", "<"), tok("tag", e.kind), ...attr("id", e.id), ...(e.size ? attr("children", e.size) : []), tok("punc", " />"));
      b.type = "button";
      b.dataset.id = e.id;
      b.title = `open ${e.label}`;
      b.addEventListener("click", () => act.open(e.id));
      return b;
    }),
    h("span", "ln", "  ", tok("punc", "</"), tok("tag", "root"), tok("punc", ">"), "\n"),
    h("span", "ln", tok("punc", "</"), tok("tag", "ir"), tok("punc", ">")),
  );

  const ast = h("button", "cta", h("span", "dim", "view source as "), "--target=ast");
  ast.type = "button";
  ast.addEventListener("click", () => act.switchTarget("ast"));

  section.append(
    h(
      "div",
      "closing",
      h("p", "close-tag", tok("punc", "</"), tok("tag", "body"), tok("punc", ">")),
      h("p", "com", "/* this page, measured in your browser just now */"),
      stats,
      h("p", "com", `/* and the source it was compiled from: ${src.entities} entities, the same IR every target traverses */`),
      tree,
      ast,
    ),
  );
  return {
    key: "end",
    label: "</body>",
    length: 1,
    stops: [0],
    section,
    apply: refresh,
    measure() {
      lastRefresh = -Infinity;
      refresh();
    },
    setFocus: (id) => markFocus(tree, id),
  };
}
