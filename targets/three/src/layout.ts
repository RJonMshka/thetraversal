import type { SceneModel, SceneNode } from "@/model";

// ── Layout: compiler passes ────────────────────────────────────────────
// One horizontal plane per contains depth, root plane on top. Inside a
// plane, nodes are seeded by an angular partition of their subtree's
// leaves (so every subtree is a wedge, stacked below its parent), leaves
// spread in a small disc under their parent, then a collision pass pushes
// overlapping nodes apart. Deterministic: same IR, same picture. The y
// axis is fixed per plane, so no 3D force simulation is needed.

export const PLANE_GAP = 4.2;
const RING_RADIUS = [0, 3.4, 8.2]; // depths 0..2; deeper levels fan out around their parent
const DISC_STEP = 0.42;
const GOLDEN_ANGLE = 2.39996;
const RELAX_ITERATIONS = 80;

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface Plane {
  depth: number;
  y: number;
  extent: number; // half-width of the square plane
  count: number;
}

export interface Layout {
  positions: Map<string, Point>;
  planes: Plane[];
}

/** Rendered radius of a node, before focus/hover scaling. */
export function nodeSize(n: Pick<SceneNode, "kind" | "depth">): number {
  if (n.kind === "role" || n.kind === "degree") return 0.17;
  return [0.55, 0.36, 0.25][n.depth] ?? 0.1;
}

export function computeLayout(model: SceneModel): Layout {
  const pos = new Map<string, Point>();
  const angle = new Map<string, number>();

  const place = (id: string, a0: number, a1: number) => {
    const n = model.nodes.get(id)!;
    const a = (a0 + a1) / 2;
    angle.set(id, a);
    const ring = RING_RADIUS[n.depth];
    if (ring !== undefined) {
      pos.set(id, { x: Math.cos(a) * ring, y: -n.depth * PLANE_GAP, z: Math.sin(a) * ring });
    } else {
      // Deeper levels: a phyllotaxis disc under the parent, pushed outward.
      const p = pos.get(n.parent!)!;
      const i = model.nodes.get(n.parent!)!.children.indexOf(id);
      const r = DISC_STEP * Math.sqrt(i + 0.5);
      const th = i * GOLDEN_ANGLE;
      pos.set(id, { x: p.x * 1.18 + Math.cos(th) * r, y: -n.depth * PLANE_GAP, z: p.z * 1.18 + Math.sin(th) * r });
    }
    let acc = a0;
    for (const c of n.children) {
      const span = ((a1 - a0) * model.nodes.get(c)!.leaves) / n.leaves;
      place(c, acc, acc + span);
      acc += span;
    }
  };
  place(model.root, -Math.PI / 2, Math.PI * 1.5);

  // Collision pass inside each plane (x/z only).
  const planes: Plane[] = [];
  for (let d = 0; d <= model.maxDepth; d++) {
    const ids = model.order.filter((id) => model.nodes.get(id)!.depth === d);
    const pts = ids.map((id) => pos.get(id)!);
    const sizes = ids.map((id) => nodeSize(model.nodes.get(id)!));
    for (let it = 0; it < RELAX_ITERATIONS; it++) {
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const A = pts[i]!;
          const B = pts[j]!;
          const min = (sizes[i]! + sizes[j]!) * 1.6 + 0.12;
          const dx = B.x - A.x;
          const dz = B.z - A.z;
          const dist = Math.hypot(dx, dz) || 1e-3;
          if (dist >= min) continue;
          const k = (min - dist) / dist / 2;
          A.x -= dx * k;
          A.z -= dz * k;
          B.x += dx * k;
          B.z += dz * k;
        }
      }
    }
    const extent = Math.max(1.6, ...pts.map((p) => Math.max(Math.abs(p.x), Math.abs(p.z)))) + 1.1;
    planes.push({ depth: d, y: -d * PLANE_GAP, extent, count: ids.length });
  }

  return { positions: pos, planes };
}
