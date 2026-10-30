import { describe, expect, it } from "vitest";
import { Graph, createIRClient } from "@tv/ir";
import graph from "@tv/ir/dist/graph.json";
import { OrbitCamera } from "@/camera";
import { PLANE_GAP, computeLayout, nodeSize } from "@/layout";
import { buildModel, createMoveMemory } from "@/model";
import { buildPalette, parseColor } from "@/palette";
import { THEMES, themeSnapshot } from "@tv/tokens";

const ir = createIRClient(Graph.parse(graph), { bodyUrl: () => "" });
const model = buildModel(ir);

describe("buildModel", () => {
  it("covers every entity once, root first, at depth 0", () => {
    expect(model.order.length).toBe(Object.keys(ir.graph.entities).length);
    expect(new Set(model.order).size).toBe(model.order.length);
    expect(model.order[0]).toBe(model.root);
    expect(model.nodes.get(model.root)!.depth).toBe(0);
  });

  it("gives children depth parent + 1", () => {
    for (const n of model.nodes.values()) {
      for (const c of n.children) expect(model.nodes.get(c)!.depth).toBe(n.depth + 1);
    }
  });

  it("marks groups by children and counts leaves", () => {
    const root = model.nodes.get(model.root)!;
    const leaves = [...model.nodes.values()].filter((n) => !n.isGroup).length;
    expect(root.isGroup).toBe(true);
    expect(root.leaves).toBe(leaves);
  });

  it("assigns categories by kind, sections by their first child", () => {
    for (const n of model.nodes.values()) {
      if (n.kind === "skill") expect(n.category).toBe("skills");
      if (n.kind === "project") expect(n.category).toBe("work");
      if (n.kind === "role") expect(n.category).toBe("career");
      if (n.kind === "essay") expect(n.category).toBe("writing");
      if (n.kind === "section") expect(n.category).toBe(model.nodes.get(n.children[0]!)!.category);
    }
  });

  it("keeps cross edges between known entities only", () => {
    expect(model.cross.length).toBeGreaterThan(0);
    for (const e of model.cross) {
      expect(e.rel).not.toBe("contains");
      expect(model.nodes.has(e.from) && model.nodes.has(e.to)).toBe(true);
      expect(model.neighbors(e.from).has(e.to)).toBe(true);
    }
  });

  it("lists ancestors from the entity up to the root", () => {
    const leaf = model.order.find((id) => model.nodes.get(id)!.depth === model.maxDepth)!;
    const path = model.ancestors(leaf);
    expect(path[0]).toBe(leaf);
    expect(path.at(-1)).toBe(model.root);
    expect(path.length).toBe(model.maxDepth + 1);
  });
});

describe("move memory", () => {
  it("has no up from the root and no down from a leaf", () => {
    const memory = createMoveMemory(model);
    expect(memory.moves(model.root).up).toBeNull();
    const leaf = model.order.find((id) => !model.nodes.get(id)!.isGroup)!;
    expect(memory.moves(leaf).down).toBeNull();
  });

  it("wraps left and right through siblings", () => {
    const memory = createMoveMemory(model);
    const parent = model.nodes.get(model.root)!;
    const first = parent.children[0]!;
    const last = parent.children.at(-1)!;
    expect(memory.moves(first).left).toBe(last);
    expect(memory.moves(last).right).toBe(first);
    expect(memory.moves(model.root).left).toBeNull();
  });

  it("goes down to the first child, then back to the child you came up from", () => {
    const memory = createMoveMemory(model);
    const parent = model.nodes.get(model.root)!;
    expect(memory.moves(parent.id).down).toBe(parent.children[0]);
    const third = parent.children[2]!;
    memory.remember(third);
    expect(memory.moves(parent.id).down).toBe(third);
  });

  it("returns empty moves for an unknown id", () => {
    expect(createMoveMemory(model).moves("nope")).toEqual({ up: null, down: null, left: null, right: null });
  });
});

describe("computeLayout", () => {
  const layout = computeLayout(model);

  it("is deterministic", () => {
    const again = computeLayout(buildModel(ir));
    for (const [id, p] of layout.positions) expect(again.positions.get(id)).toEqual(p);
  });

  it("puts every node on its depth's plane", () => {
    for (const [id, p] of layout.positions) expect(p.y).toBeCloseTo(-model.nodes.get(id)!.depth * PLANE_GAP);
    expect(layout.planes.length).toBe(model.maxDepth + 1);
    expect(layout.planes.reduce((s, p) => s + p.count, 0)).toBe(model.order.length);
  });

  it("keeps every node inside its plane", () => {
    for (const [id, p] of layout.positions) {
      const plane = layout.planes[model.nodes.get(id)!.depth]!;
      expect(Math.abs(p.x)).toBeLessThan(plane.extent);
      expect(Math.abs(p.z)).toBeLessThan(plane.extent);
    }
  });

  it("separates nodes on the same plane so they do not overlap", () => {
    for (const plane of layout.planes) {
      const ids = model.order.filter((id) => model.nodes.get(id)!.depth === plane.depth);
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = layout.positions.get(ids[i]!)!;
          const b = layout.positions.get(ids[j]!)!;
          const touch = nodeSize(model.nodes.get(ids[i]!)!) + nodeSize(model.nodes.get(ids[j]!)!);
          expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(touch);
        }
      }
    }
  });
});

describe("OrbitCamera", () => {
  it("jumps when instant and eases to the target otherwise", () => {
    const cam = new OrbitCamera({ x: 0, y: 0, z: 0 }, 30);
    cam.flyTo({ x: 5, y: -4, z: 2 }, 10, { instant: true, now: 0 });
    expect(cam.target).toEqual({ x: 5, y: -4, z: 2 });
    expect(cam.animating).toBe(false);

    cam.flyTo({ x: 0, y: 0, z: 0 }, 20, { instant: false, now: 1000 });
    expect(cam.step(1300)).toBe(true);
    expect(cam.target.x).toBeGreaterThan(0);
    expect(cam.step(1600)).toBe(false);
    expect(cam.target).toEqual({ x: 0, y: 0, z: 0 });
    expect(cam.radius).toBe(20);
  });

  it("clamps zoom and pitch", () => {
    const cam = new OrbitCamera({ x: 0, y: 0, z: 0 }, 30);
    cam.zoomTo(1);
    expect(cam.radius).toBe(4);
    cam.zoomTo(1000);
    expect(cam.radius).toBe(60);
    cam.orbit(0, -10_000);
    expect(cam.phi).toBeLessThanOrEqual(1.45);
  });
});

describe("parseColor", () => {
  it("reads hex, rgba and oklch as sRGB 0..1", () => {
    expect(parseColor("#ffffff")).toEqual([1, 1, 1]);
    expect(parseColor("#000")).toEqual([0, 0, 0]);
    expect(parseColor("rgba(255,255,255,0.07)")).toEqual([1, 1, 1]);
    expect(parseColor("rgb(51 102 153)")!.map((x) => Math.round(x * 255))).toEqual([51, 102, 153]);
  });

  it("converts oklch like the browser does", () => {
    // MINT_ACCENT_SRGB in @tv/tokens is the sRGB of oklch(0.82 0.13 160): #6fdea7.
    const mint = parseColor("oklch(0.82 0.13 160)")!.map((x) => Math.round(x * 255));
    const want = [0x6f, 0xde, 0xa7];
    mint.forEach((v, i) => expect(Math.abs(v - want[i]!)).toBeLessThanOrEqual(2));
    expect(parseColor("oklch(0.82 0.13 160 / 0.08)")).toEqual(parseColor("oklch(0.82 0.13 160)"));
  });

  it("returns null for formats it does not know", () => {
    expect(parseColor("var(--accent)")).toBeNull();
    expect(parseColor("tomato")).toBeNull();
  });

  it("parses every theme in @tv/tokens", () => {
    for (const name of Object.keys(THEMES) as (keyof typeof THEMES)[]) {
      const snap = themeSnapshot(name, "mono");
      for (const css of [...Object.values(snap.colors), ...Object.values(snap.syntax ?? {})]) {
        expect(parseColor(css), `${name}: ${css}`).not.toBeNull();
      }
      const p = buildPalette(snap);
      expect(p.category.work).not.toEqual(p.text);
    }
  });
});
