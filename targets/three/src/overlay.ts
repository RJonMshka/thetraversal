import type { ChromeInset } from "@tv/contract";
import type { Layout } from "@/layout";
import type { Direction, Moves, SceneModel } from "@/model";
import type { SceneApi } from "@/scene";

// ── Overlay ────────────────────────────────────────────────────────────
// DOM drawn over the canvas, inside the shadow root: entity labels, plane
// labels, the focus card (path, summary, the moves each key makes) and
// the legend. Labels are aria-hidden; the shell's accessible list is the
// screen-reader path, and a live region announces focus changes.

const HUB_KINDS = new Set([
  "root",
  "identity",
  "section",
  "essays",
  "timeline",
  "connect",
  "project",
  "paper",
  "role",
  "roles",
  "skill-cluster",
  "essay",
  "education",
  "resume",
]);
const PLANE_NAMES = ["root", "sections", "nodes", "leaves"];
const MOVE_KEYS: [Direction, string, string][] = [
  ["up", "↑", "Parent"],
  ["down", "↓", "Child"],
  ["left", "←", "Previous sibling"],
  ["right", "→", "Next sibling"],
];
const LEGEND: [string, string, string][] = [
  ["work", "■", "work · projects, paper"],
  ["skills", "●", "skills"],
  ["career", "⬢", "career · roles, education"],
  ["writing", "▲", "writing · essays"],
  ["self", "◆", "identity · links"],
];

export interface OverlayApi {
  setFocus(id: string | null, moves: Moves): void;
  setHover(id: string | null): void;
  setInset(inset: ChromeInset): void;
  dispose(): void;
}

interface OverlayDeps {
  container: HTMLElement;
  model: SceneModel;
  layout: Layout;
  scene: SceneApi;
  coarsePointer: boolean;
  onFocus(id: string): void;
  onOpen(id: string): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createOverlay(deps: OverlayDeps): OverlayApi {
  const { container, model, layout, scene } = deps;

  const labelLayer = el("div", "labels");
  labelLayer.setAttribute("aria-hidden", "true");
  const labels = new Map<string, HTMLDivElement>();
  for (const id of model.order) {
    const n = model.nodes.get(id)!;
    const label = el("div", HUB_KINDS.has(n.kind) ? "lbl hub" : "lbl", n.label);
    labels.set(id, label);
    labelLayer.append(label);
  }
  const planeLabels = layout.planes.map((p) => {
    const label = el("div", "lbl plane", `pass ${p.depth} · ${PLANE_NAMES[p.depth] ?? `depth ${p.depth}`} · ${p.count}`);
    labelLayer.append(label);
    return label;
  });

  const card = el("section", "card");
  card.setAttribute("aria-label", "Focused entity");
  const status = el("div", "sr-only");
  status.setAttribute("role", "status");

  const legend = el("div", "legend");
  legend.setAttribute("aria-hidden", "true");
  for (const [cat, glyph, text] of LEGEND) legend.append(el("div", `c-${cat}`, `${glyph} ${text}`));
  legend.append(el("div", "sep", "outline only = group · filled = item"));
  legend.append(el("div", "ln", "contains"), el("div", "ln acc", "uses · implements · focus path"));

  container.append(labelLayer, card, legend, status);

  let focus = model.root;
  let overview = true;
  let hover: string | null = null;
  const show = new Map<string, { on: boolean; dim: boolean }>();

  function refreshLabels() {
    const f = model.nodes.get(focus)!;
    const near = model.neighbors(focus);
    const path = new Set(model.ancestors(focus));
    for (const [id, label] of labels) {
      const n = model.nodes.get(id)!;
      const isFocus = id === focus && !overview;
      const related = id === hover || near.has(id) || path.has(id);
      label.classList.toggle("focus", isFocus);
      show.set(id, {
        on: isFocus || related || HUB_KINDS.has(n.kind),
        dim: !(isFocus || related || overview || n.depth === f.depth),
      });
    }
    planeLabels.forEach((label, d) => label.classList.toggle("on", !overview && d === f.depth));
    place();
  }

  // Runs after every rendered frame: labels follow the camera.
  function place() {
    for (const [id, label] of labels) {
      const s = show.get(id);
      const p = scene.project(layout.positions.get(id)!);
      if (!s?.on || !p.visible) {
        label.style.opacity = "0";
        continue;
      }
      label.style.opacity = s.dim ? "0.35" : "1";
      label.style.transform = `translate(${p.x + 8}px, ${p.y - 8}px)`;
    }
    layout.planes.forEach((plane, i) => {
      const p = scene.project({ x: -plane.extent, y: plane.y, z: plane.extent });
      const label = planeLabels[i]!;
      label.style.opacity = p.visible ? "1" : "0";
      label.style.transform = `translate(${p.x + 4}px, ${p.y - 16}px)`;
    });
  }
  scene.onFrame(place);

  function renderCard(moves: Moves) {
    const n = model.nodes.get(focus)!;
    card.replaceChildren();

    const path = el("nav", "path");
    path.setAttribute("aria-label", "Path");
    model
      .ancestors(focus)
      .reverse()
      .forEach((id, i, all) => {
        if (i) path.append(el("span", "sep", "›"));
        const b = el("button", undefined, model.nodes.get(id)!.label);
        b.type = "button";
        if (i === all.length - 1) b.setAttribute("aria-current", "location");
        else b.addEventListener("click", () => deps.onFocus(id));
        path.append(b);
      });

    const head = el("div", "head");
    head.append(el("span", "kind", `${n.kind} · pass ${n.depth}`));
    const open = el("button", "open", "open →");
    open.type = "button";
    open.setAttribute("aria-label", `Open ${n.label}`);
    open.addEventListener("click", () => deps.onOpen(n.id));
    head.append(open);

    const title = el("h2", undefined, n.label);
    card.append(path, head, title);
    if (n.summary) card.append(el("p", undefined, n.summary));

    const nav = el("div", "moves");
    nav.setAttribute("role", "group");
    nav.setAttribute("aria-label", "Move focus");
    for (const [dir, key, name] of MOVE_KEYS) {
      const to = moves[dir];
      if (!to) continue;
      const label = model.nodes.get(to)!.label;
      const b = el("button", "mv");
      b.type = "button";
      b.setAttribute("aria-label", `${name}: ${label}`);
      b.append(el("kbd", undefined, key), el("span", undefined, label));
      b.addEventListener("click", () => deps.onFocus(to));
      nav.append(b);
    }
    if (nav.childElementCount) card.append(nav);

    card.append(
      el(
        "div",
        "hint",
        deps.coarsePointer
          ? "tap to focus · tap empty space to step out · drag to orbit · pinch to zoom"
          : "Enter or double-click opens · Esc or empty-space click steps out · drag to orbit · scroll or +/− to zoom"
      )
    );
    status.textContent = `${n.label}, ${n.kind}`;
  }

  return {
    setFocus(id, moves) {
      focus = id && model.nodes.has(id) ? id : model.root;
      overview = focus === model.root;
      renderCard(moves);
      refreshLabels();
    },
    setHover(id) {
      if (id === hover) return;
      hover = id;
      refreshLabels();
    },
    setInset(inset) {
      container.style.setProperty("--inset-right", `${inset.right}px`);
      container.style.setProperty("--inset-bottom", `${inset.bottom}px`);
      container.style.setProperty("--inset-left", `${inset.left}px`);
    },
    dispose() {
      labelLayer.remove();
      card.remove();
      legend.remove();
      status.remove();
    },
  };
}
