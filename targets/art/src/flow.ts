import type { ArtModel, Placed, Point } from "@/model";

// ── Flow ───────────────────────────────────────────────────────────────
// A particle is born at an emitter, flows down the contains tree to an
// entity, and, when that entity uses or implements others, is pulled
// across to one of them. Pure and seeded: the same IR and seed give the
// same piece, so the still frame for reduced motion is stable.

export type Rng = () => number;

/** mulberry32. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a over a string: the seed is the IR's ids, so it changes with the content. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface Route {
  /** Entity ids, emitter first. */
  ids: string[];
  /** Index of the first pull segment (ids[pullFrom] → ids[pullFrom + 1]), or -1. */
  pullFrom: number;
  /** Entity whose color the particle carries: where it was headed in the tree. */
  tint: string;
  /** Inside the focused subtree. */
  lit: boolean;
}

/** Share of particles born inside the focused subtree while something is focused. */
export const FOCUS_SHARE = 0.6;
const PULL_CHANCE = 0.75;

const pick = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)]!;

export function pickRoute(model: ArtModel, rng: Rng, focus: string | null): Route {
  const top = focus && model.nodes.has(focus) && focus !== model.root ? focus : null;
  const inside = top ? model.leaves.filter((id) => model.within(id, top)) : [];
  const lit = inside.length > 0 && rng() < FOCUS_SHARE;
  const end = pick(rng, lit ? inside : model.leaves);

  const chain = model.ancestors(end).reverse(); // root … end
  // Emitter: the focus for lit particles, otherwise any ancestor, root weighted up.
  let start = 0;
  if (lit && top) start = chain.indexOf(top);
  else if (chain.length > 1 && rng() < 0.6) start = Math.floor(rng() * (chain.length - 1));
  const ids = chain.slice(start);

  // The deepest entity on the way with relations pulls the particle across.
  let pullFrom = -1;
  for (let i = ids.length - 1; i >= 0; i--) {
    const pulls = model.nodes.get(ids[i]!)!.pulls;
    if (pulls.length && rng() < PULL_CHANCE) {
      ids.splice(i + 1, ids.length, pick(rng, pulls));
      pullFrom = i;
      break;
    }
  }
  // A focused leaf with nothing to pull toward: flow in from its parent.
  if (ids.length === 1 && chain.length > 1) ids.unshift(chain[chain.length - 2]!);
  return { ids, pullFrom, tint: end, lit };
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * Position along a route at s (0 … ids.length - 1), in unit coordinates.
 * Tree segments sweep in polar coordinates (a spiral from parent to
 * child); the pull segment is a chord bowed toward the center. `wobble`
 * (unit radius) sways the particle off the line, never at the entities.
 */
export function pointAt(placed: ReadonlyMap<string, Placed>, route: Route, s: number, wobble = 0, phase = 0): Point {
  const last = route.ids.length - 1;
  const clamped = Math.min(Math.max(s, 0), last);
  const i = Math.min(Math.floor(clamped), Math.max(last - 1, 0));
  const t = clamped - i;
  const a = placed.get(route.ids[i]!)!;
  const b = placed.get(route.ids[Math.min(i + 1, last)]!)!;
  let x: number;
  let y: number;
  if (i === route.pullFrom) {
    // Quadratic Bézier with the control point pulled toward the center.
    const cx = (a.x + b.x) * 0.25;
    const cy = (a.y + b.y) * 0.25;
    const u = 1 - t;
    x = u * u * a.x + 2 * u * t * cx + t * t * b.x;
    y = u * u * a.y + 2 * u * t * cy + t * t * b.y;
  } else {
    // The root has no angle of its own: leave it along the child's.
    const from = a.radius === 0 ? b.angle : a.angle;
    const e = ease(t);
    const angle = lerpAngle(from, b.angle, e);
    const radius = a.radius + (b.radius - a.radius) * t;
    x = Math.cos(angle) * radius;
    y = Math.sin(angle) * radius;
  }
  if (wobble) {
    const sway = Math.sin(Math.PI * t) * Math.sin(phase + s * 5.3) * wobble;
    const len = Math.hypot(x, y) || 1;
    const nx = -y / len;
    const ny = x / len;
    x += nx * sway;
    y += ny * sway;
  }
  return { x, y };
}
