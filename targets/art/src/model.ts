import type { IRClient } from "@tv/ir/client";

// ── Model ──────────────────────────────────────────────────────────────
// The IR as the piece sees it: the contains tree (depth is the ring), a
// category per entity (the color), and the relations that cut across the
// tree (the attractors). Pure: unit tested against the real IR.

export type Category = "work" | "skills" | "career" | "writing" | "self";

export interface ArtNode {
  id: string;
  label: string;
  parent: string | null;
  children: string[];
  depth: number;
  /** Leaf count under this node (1 for a leaf): its share of the circle. */
  leaves: number;
  category: Category;
  /** Entities this one uses or implements: where its particles are pulled. */
  pulls: string[];
}

export interface ArtModel {
  root: string;
  nodes: Map<string, ArtNode>;
  /** DFS in contains order. */
  order: string[];
  leaves: string[];
  maxDepth: number;
  /** id first, root last. */
  ancestors(id: string): string[];
  /** Whether `id` is `top` or inside its subtree. */
  within(id: string, top: string): boolean;
}

const KIND_CATEGORY: Record<string, Category> = {
  project: "work",
  paper: "work",
  "skill-cluster": "skills",
  skill: "skills",
  timeline: "career",
  roles: "career",
  role: "career",
  education: "career",
  degree: "career",
  resume: "career",
  essays: "writing",
  essay: "writing",
};

export function buildModel(ir: IRClient): ArtModel {
  const nodes = new Map<string, ArtNode>();
  const order: string[] = [];
  let root: string | null = null;

  ir.walk((e, depth) => {
    const parent = ir.parent(e.id)?.id ?? null;
    if (parent === null && root === null) root = e.id;
    nodes.set(e.id, {
      id: e.id,
      label: e.label,
      parent,
      children: ir.children(e.id).map((c) => c.id),
      depth,
      leaves: 1,
      category: KIND_CATEGORY[e.kind] ?? "self",
      pulls: [],
    });
    order.push(e.id);
  });
  if (root === null) throw new Error("IR has no root entity");

  for (const id of [...order].reverse()) {
    const n = nodes.get(id)!;
    if (n.children.length) n.leaves = n.children.reduce((sum, c) => sum + (nodes.get(c)?.leaves ?? 0), 0);
  }
  // A section takes the category of its first child (projects, skills, ...).
  for (const id of order) {
    const n = nodes.get(id)!;
    const first = n.children[0] && nodes.get(n.children[0]);
    if (n.category === "self" && n.depth === 1 && first) n.category = first.category;
  }
  for (const e of ir.graph.edges) {
    if (e.rel === "contains" || e.from === e.to) continue;
    const from = nodes.get(e.from);
    if (from && nodes.has(e.to) && !from.pulls.includes(e.to)) from.pulls.push(e.to);
  }

  return {
    root,
    nodes,
    order,
    leaves: order.filter((id) => nodes.get(id)!.children.length === 0),
    maxDepth: Math.max(...[...nodes.values()].map((n) => n.depth)),
    ancestors(id) {
      const out: string[] = [];
      for (let cur = nodes.get(id); cur; cur = cur.parent ? nodes.get(cur.parent) : undefined) out.push(cur.id);
      return out;
    },
    within(id, top) {
      for (let cur = nodes.get(id); cur; cur = cur.parent ? nodes.get(cur.parent) : undefined) if (cur.id === top) return true;
      return false;
    },
  };
}

// ── Layout ─────────────────────────────────────────────────────────────
// Radial: the root at the center, one ring per depth, each entity in the
// middle of an angular slice sized by its leaves. Unit coordinates: the
// outermost ring has radius 1. Deterministic, no simulation.

export interface Point {
  x: number;
  y: number;
}

export interface Placed extends Point {
  angle: number;
  radius: number;
}

/** Ring radius per depth: inner rings a little wider apart than a linear spacing. */
export function ringRadius(depth: number, maxDepth: number): number {
  if (depth === 0 || maxDepth === 0) return 0;
  return Math.pow(depth / maxDepth, 0.8);
}

export function layout(model: ArtModel, start = -Math.PI / 2): Map<string, Placed> {
  const out = new Map<string, Placed>();
  const place = (id: string, from: number, span: number) => {
    const n = model.nodes.get(id)!;
    const angle = from + span / 2;
    const radius = ringRadius(n.depth, model.maxDepth);
    out.set(id, { angle, radius, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    let at = from;
    for (const c of n.children) {
      const share = (span * model.nodes.get(c)!.leaves) / n.leaves;
      place(c, at, share);
      at += share;
    }
  };
  place(model.root, start, Math.PI * 2);
  return out;
}
