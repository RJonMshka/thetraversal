import { describe, expect, it } from "vitest";
import { Graph, createIRClient } from "@tv/ir";
import graph from "@tv/ir/dist/graph.json";
import { THEMES, themeSnapshot } from "@tv/tokens";
import { FOCUS_SHARE, createRng, hashString, pickRoute, pointAt } from "@/flow";
import { buildModel, layout, ringRadius } from "@/model";
import { buildPalette, isLight, parseColor, rgba } from "@/palette";

const ir = createIRClient(Graph.parse(graph), { bodyUrl: () => "" });
const model = buildModel(ir);
const placed = layout(model);

describe("model", () => {
  it("covers every entity once, root first", () => {
    expect(model.order.length).toBe(Object.keys(ir.graph.entities).length);
    expect(new Set(model.order).size).toBe(model.order.length);
    expect(model.order[0]).toBe(model.root);
  });

  it("collects relations as pulls and leaves as the ends of the tree", () => {
    const pulls = [...model.nodes.values()].reduce((n, e) => n + e.pulls.length, 0);
    expect(pulls).toBeGreaterThan(0);
    for (const id of model.leaves) expect(model.nodes.get(id)!.children).toEqual([]);
    expect(model.nodes.get(model.root)!.leaves).toBe(model.leaves.length);
  });

  it("answers ancestry", () => {
    const leaf = model.leaves[0]!;
    const chain = model.ancestors(leaf);
    expect(chain[0]).toBe(leaf);
    expect(chain.at(-1)).toBe(model.root);
    expect(model.within(leaf, model.root)).toBe(true);
    expect(model.within(model.root, leaf)).toBe(false);
  });
});

describe("layout", () => {
  it("puts the root at the center and each depth on its ring", () => {
    expect(placed.get(model.root)).toMatchObject({ x: 0, y: 0, radius: 0 });
    for (const n of model.nodes.values()) {
      const p = placed.get(n.id)!;
      expect(p.radius).toBeCloseTo(ringRadius(n.depth, model.maxDepth));
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(p.radius);
    }
    expect(ringRadius(model.maxDepth, model.maxDepth)).toBe(1);
  });

  it("keeps children inside their parent's slice, in order", () => {
    for (const n of model.nodes.values()) {
      const angles = n.children.map((c) => placed.get(c)!.angle);
      expect([...angles].sort((a, b) => a - b)).toEqual(angles);
    }
  });
});

describe("flow", () => {
  it("is deterministic for a seed", () => {
    const a = createRng(hashString("x"));
    const b = createRng(hashString("x"));
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(hashString("a")).not.toBe(hashString("b"));
  });

  it("routes run down the tree, then at most one pull across", () => {
    const rng = createRng(7);
    let pulled = 0;
    for (let i = 0; i < 500; i++) {
      const r = pickRoute(model, rng, null);
      expect(r.ids.length).toBeGreaterThanOrEqual(2);
      const treeEnd = r.pullFrom === -1 ? r.ids.length - 1 : r.pullFrom;
      for (let k = 0; k < treeEnd; k++) expect(model.nodes.get(r.ids[k + 1]!)!.parent).toBe(r.ids[k]);
      if (r.pullFrom !== -1) {
        pulled++;
        expect(r.pullFrom).toBe(r.ids.length - 2);
        expect(model.nodes.get(r.ids[r.pullFrom]!)!.pulls).toContain(r.ids.at(-1));
      }
      expect(r.lit).toBe(false);
    }
    expect(pulled).toBeGreaterThan(0);
  });

  it("sends most particles from the focus while something is focused", () => {
    const focus = model.nodes.get(model.root)!.children[0]!;
    const rng = createRng(3);
    let lit = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) {
      const r = pickRoute(model, rng, focus);
      if (r.lit) {
        lit++;
        expect(r.ids[0]).toBe(focus);
        expect(model.within(r.tint, focus)).toBe(true);
      }
    }
    expect(lit / n).toBeGreaterThan(FOCUS_SHARE - 0.05);
    expect(lit / n).toBeLessThan(FOCUS_SHARE + 0.05);
  });

  it("a focused leaf still flows", () => {
    const leaf = model.leaves.find((id) => model.nodes.get(id)!.pulls.length === 0)!;
    const rng = createRng(1);
    for (let i = 0; i < 50; i++) {
      const r = pickRoute(model, rng, leaf);
      if (r.lit) expect(r.ids.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("passes through every entity on its route", () => {
    const r = pickRoute(model, createRng(11), null);
    r.ids.forEach((id, k) => {
      const p = pointAt(placed, r, k, 0.02, 1);
      const want = placed.get(id)!;
      expect(p.x).toBeCloseTo(want.x, 5);
      expect(p.y).toBeCloseTo(want.y, 5);
    });
  });
});

describe("palette", () => {
  it("parses every theme's colors", () => {
    for (const name of Object.keys(THEMES)) {
      const t = themeSnapshot(name as keyof typeof THEMES);
      for (const css of [...Object.values(t.colors), ...Object.values(t.syntax ?? {})]) {
        if (css.startsWith("#") || css.startsWith("rgb") || css.startsWith("oklch")) expect(parseColor(css)).not.toBeNull();
      }
      const p = buildPalette(t);
      expect(rgba(p.accent, 0.5)).toMatch(/^rgba\(\d+,\d+,\d+,0\.5\)$/);
    }
    expect(isLight([1, 1, 1])).toBe(true);
    expect(isLight([0, 0, 0])).toBe(false);
  });
});
