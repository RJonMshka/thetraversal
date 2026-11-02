import { describe, expect, it } from "vitest";
import { Graph, createIRClient } from "@tv/ir";
import graph from "@tv/ir/dist/graph.json";
import { flexShading, gridLines, lines, parseTracks, size } from "@/geometry";
import { FEATURED, buildModel, lede } from "@/model";
import { BOX_SCRUBS, DOC_NODES, FLEX_STEPS, STOPS, boxState, docState, flexState, gridState, gridSteps } from "@/timeline";

const ir = createIRClient(Graph.parse(graph), { bodyUrl: () => "" });
const model = buildModel(ir);

describe("model", () => {
  it("reads the hero, sections, card and flex items from the IR", () => {
    expect(model.name).toBe(ir.entity(ir.graph.rootId)!.label);
    expect(model.summary.length).toBeGreaterThan(0);
    expect(model.sections.length).toBeGreaterThan(2);
    expect(model.sections.some((s) => s.id === "identity")).toBe(false);
    expect(model.flex.items.length).toBeGreaterThan(4);
    for (const s of [...model.sections, ...model.flex.items]) expect(model.has(s.id)).toBe(true);
    expect(model.card.text.length).toBeLessThanOrEqual(220);
  });

  it("names the current role, unless the root sets a headline", () => {
    expect(model.now).toMatch(/present/i);
    const g = Graph.parse(graph);
    g.entities[g.rootId] = { ...g.entities[g.rootId]!, headline: "Senior frontend engineer" };
    expect(buildModel(createIRClient(g, { bodyUrl: () => "" })).now).toBe("Senior frontend engineer");
  });

  it("cuts a lede on sentence boundaries", () => {
    expect(lede("One. Two. Three.", 9)).toBe("One. Two.");
    expect(lede("Short.\n\nSecond paragraph.")).toBe("Short.");
    expect(lede("one two three, four five", 16)).toBe("one two three…");
  });
});

describe("timeline: document", () => {
  const lengths = { h1: 11, summary: 40, now: 20, nav: 5 };

  it("starts empty and ends fully typed", () => {
    expect(docState(0, lengths)).toEqual({ shown: { h1: -1, summary: -1, now: -1, nav: -1 }, active: null });
    expect(docState(1, lengths)).toEqual({ shown: lengths, active: "nav" });
  });

  it("types one node at a time, in order", () => {
    const n = DOC_NODES[1]!;
    const mid = docState((n.start + n.end) / 2, lengths);
    expect(mid.active).toBe("summary");
    expect(mid.shown.h1).toBe(lengths.h1);
    expect(mid.shown.summary).toBe(20);
    expect(mid.shown.now).toBe(-1);
  });

  it("skips empty nodes", () => {
    expect(docState(1, { ...lengths, now: 0 }).shown.now).toBe(-1);
  });
});

describe("timeline: box model", () => {
  it("scrubs each property from 0 to its target", () => {
    expect(Object.values(boxState(0).values)).toEqual([0, 0, 0, 0]);
    const end = boxState(1).values;
    for (const s of BOX_SCRUBS) expect(end[s.prop]).toBe(s.to);
    expect(boxState(0.23).values.padding).toBe(16);
    expect(boxState(0.23).active?.prop).toBe("padding");
  });
});

describe("timeline: flex", () => {
  it("starts as a block and applies one declaration per step", () => {
    expect(flexState(0)).toMatchObject({ step: -1, container: { display: "block" }, gap: 0 });
    FLEX_STEPS.forEach((s, i) => expect(flexState(s.at).step).toBe(i));
    const end = flexState(1);
    expect(end.container).toMatchObject({ display: "flex", "flex-wrap": "wrap", gap: "12px", "justify-content": "space-between" });
    expect(end.item).toEqual({ "flex-grow": "1" });
  });

  it("later values win for the same property", () => {
    const center = FLEX_STEPS.find((s) => s.value === "center")!;
    expect(flexState(center.at).container["justify-content"]).toBe("center");
  });

  it("puts a keyboard stop after every beat, in order", () => {
    for (const stops of Object.values(STOPS)) {
      expect(stops[0]).toBe(0);
      expect([...stops].sort((a, b) => a - b)).toEqual([...stops]);
      for (const t of stops) expect(t).toBeLessThanOrEqual(1);
    }
    for (let i = 1; i < STOPS.flex.length; i++) expect(flexState(STOPS.flex[i]!).step).toBe(i - 1);
  });
});

describe("geometry", () => {
  const content = { x: 0, y: 0, w: 100, h: 40 };

  it("groups boxes into lines", () => {
    const ls = lines([
      { x: 50, y: 0, w: 10, h: 10 },
      { x: 0, y: 1, w: 10, h: 10 },
      { x: 0, y: 20, w: 10, h: 10 },
    ]);
    expect(ls.map((l) => l.map((b) => b.x))).toEqual([[0, 50], [0]]);
  });

  it("shades free space and gaps on a line", () => {
    const s = flexShading(content, [{ x: 10, y: 0, w: 20, h: 10 }, { x: 40, y: 0, w: 20, h: 10 }], 4);
    expect(s.free).toEqual([
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 34, y: 0, w: 6, h: 10 },
      { x: 60, y: 0, w: 40, h: 10 },
    ]);
    expect(s.gaps).toEqual([{ x: 30, y: 0, w: 4, h: 10 }]);
    expect(s.overflow).toBe(0);
  });

  it("reports overflow past the content box", () => {
    expect(flexShading(content, [{ x: 0, y: 0, w: 70, h: 10 }, { x: 70, y: 0, w: 60, h: 10 }], 0).overflow).toBe(30);
  });

  it("prints sizes like devtools", () => {
    expect(size(612.4, 58)).toBe("612.4 × 58");
    expect(size(10.126, 3.1)).toBe("10.13 × 3.1");
  });
});

describe("timeline: box model on narrow screens", () => {
  it("halves padding and margin, keeps border and radius", () => {
    expect(boxState(1, 0.5).values).toEqual({ padding: 16, "border-width": 2, margin: 20, "border-radius": 10 });
  });
});

describe("model: grid", () => {
  it("lists the projects and features this site", () => {
    expect(model.grid.items.map((p) => p.id)).toEqual(ir.children("projects").map((e) => e.id));
    expect(model.grid.featured).toBe(FEATURED);
    for (const p of model.grid.items) expect(p.stack.length).toBeLessThanOrEqual(3);
  });
});

describe("timeline: grid", () => {
  it("goes block → grid → 2 tracks → 3 tracks, then places the featured item", () => {
    expect(gridState(0)).toMatchObject({ step: -1, cols: 1, container: { display: "block" } });
    expect(gridState(0.1)).toMatchObject({ cols: 1, container: { display: "grid" } });
    expect(gridState(0.25).cols).toBe(2);
    expect(gridState(0.39).gap).toBe(8);
    const end = gridState(1);
    expect(end).toMatchObject({ cols: 3, gap: 16, item: { "grid-column": "1 / -1", "grid-row": "1" } });
  });

  it("stays at two tracks on phones", () => {
    expect(gridState(1, 2).cols).toBe(2);
    expect(gridSteps(2).length).toBe(gridSteps(3).length);
  });

  it("puts a keyboard stop after every step", () => {
    for (let i = 1; i < STOPS.grid.length; i++) expect(gridState(STOPS.grid[i]!).step).toBe(i - 1);
  });
});

describe("geometry: grid", () => {
  it("parses computed track lists", () => {
    expect(parseTracks("160px 160.5px 160px")).toEqual([160, 160.5, 160]);
    expect(parseTracks("none")).toEqual([]);
  });

  it("puts a line at every track start and after the last, gutters between", () => {
    const g = gridLines({ x: 0, y: 0, w: 220, h: 100 }, [100, 100], [40, 40], 20, 10);
    expect(g.cols).toEqual([0, 120, 220]);
    expect(g.rows).toEqual([0, 50, 90]);
    expect(g.gaps).toEqual([
      { x: 100, y: 0, w: 20, h: 90 },
      { x: 0, y: 40, w: 220, h: 10 },
    ]);
  });
});
