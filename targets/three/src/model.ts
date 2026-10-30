import type { IRClient } from "@tv/ir/client";

// ── Scene model ────────────────────────────────────────────────────────
// The IR as the scene sees it: the contains tree with depth (one plane per
// depth), a category per entity (shape and color), and the non-contains
// edges that cut across planes.

export type Category = "work" | "skills" | "career" | "writing" | "self";

export interface SceneNode {
  id: string;
  kind: string;
  label: string;
  summary: string;
  parent: string | null;
  children: string[]; // contains order
  depth: number;
  leaves: number; // leaf count under this node (1 for a leaf)
  category: Category;
  isGroup: boolean; // has children: drawn as an outline only
}

export interface CrossEdge {
  from: string;
  to: string;
  rel: string;
}

export interface SceneModel {
  root: string;
  nodes: Map<string, SceneNode>;
  order: string[]; // DFS in contains order
  cross: CrossEdge[];
  maxDepth: number;
  neighbors(id: string): ReadonlySet<string>;
  ancestors(id: string): string[]; // id first, root last
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
  root: "self",
  identity: "self",
  connect: "self",
  channel: "self",
};

export function buildModel(ir: IRClient): SceneModel {
  const nodes = new Map<string, SceneNode>();
  const order: string[] = [];
  let root: string | null = null;

  ir.walk((e, depth) => {
    const parent = ir.parent(e.id)?.id ?? null;
    if (parent === null && root === null) root = e.id;
    nodes.set(e.id, {
      id: e.id,
      kind: e.kind,
      label: e.label,
      summary: e.summary,
      parent,
      children: ir.children(e.id).map((c) => c.id),
      depth,
      leaves: 1,
      category: KIND_CATEGORY[e.kind] ?? "self",
      isGroup: false,
    });
    order.push(e.id);
  });
  if (root === null) throw new Error("IR has no root entity");

  // Leaf counts and groups, bottom-up (reverse DFS visits children first).
  for (const id of [...order].reverse()) {
    const n = nodes.get(id)!;
    n.isGroup = n.children.length > 0;
    if (n.isGroup) n.leaves = n.children.reduce((sum, c) => sum + (nodes.get(c)?.leaves ?? 0), 0);
  }
  // A section takes the category of its first child (projects, research, skills).
  for (const n of nodes.values()) {
    if (n.kind !== "section") continue;
    const first = n.children[0] && nodes.get(n.children[0]);
    if (first) n.category = first.category;
  }

  const cross = ir.graph.edges
    .filter((e) => e.rel !== "contains" && nodes.has(e.from) && nodes.has(e.to))
    .map((e) => ({ from: e.from, to: e.to, rel: e.rel }));

  const near = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!near.has(a)) near.set(a, new Set());
    near.get(a)!.add(b);
  };
  for (const n of nodes.values()) {
    if (n.parent) {
      link(n.id, n.parent);
      link(n.parent, n.id);
    }
  }
  for (const e of cross) {
    link(e.from, e.to);
    link(e.to, e.from);
  }
  const none: ReadonlySet<string> = new Set();

  return {
    root,
    nodes,
    order,
    cross,
    maxDepth: Math.max(...[...nodes.values()].map((n) => n.depth)),
    neighbors: (id) => near.get(id) ?? none,
    ancestors(id) {
      const out: string[] = [];
      for (let cur = nodes.get(id); cur; cur = cur.parent ? nodes.get(cur.parent) : undefined) out.push(cur.id);
      return out;
    },
  };
}

// ── Moves ──────────────────────────────────────────────────────────────
// Keys follow the stack: up = parent plane, down = child plane,
// left/right = siblings (wrapping). Down returns to the child the visitor
// came up from, so up-then-down is a round trip.

export type Direction = "up" | "down" | "left" | "right";
export type Moves = Record<Direction, string | null>;

export interface MoveMemory {
  moves(id: string): Moves;
  /** Record a focus so that later "down" moves return along its path. */
  remember(id: string): void;
}

export function createMoveMemory(model: SceneModel): MoveMemory {
  const lastChild = new Map<string, string>();
  return {
    moves(id) {
      const n = model.nodes.get(id);
      if (!n) return { up: null, down: null, left: null, right: null };
      const siblings = n.parent ? model.nodes.get(n.parent)!.children : [n.id];
      const i = siblings.indexOf(n.id);
      const wrap = (k: number) => siblings[(k + siblings.length) % siblings.length]!;
      return {
        up: n.parent,
        down: n.children.length ? (lastChild.get(id) ?? n.children[0]!) : null,
        left: siblings.length > 1 ? wrap(i - 1) : null,
        right: siblings.length > 1 ? wrap(i + 1) : null,
      };
    },
    remember(id) {
      for (let cur = model.nodes.get(id); cur?.parent; cur = model.nodes.get(cur.parent)) {
        lastChild.set(cur.parent, cur.id);
      }
    },
  };
}
