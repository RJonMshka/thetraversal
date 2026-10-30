import type { Point } from "@/layout";

// ── Orbit camera ───────────────────────────────────────────────────────
// Spherical coordinates around a target point. Drag orbits, wheel and
// pinch zoom, fly-to eases target and radius over 600 ms (instant with
// reduced motion). Pure state: the scene reads `position()` each frame.

export const FLY_MS = 600;
const ZOOM_MS = 220;
const MIN_RADIUS = 4;
const MAX_RADIUS = 60;
const MIN_PHI = 0.25;
const MAX_PHI = 1.45;

interface Anim {
  t0: number;
  dur: number;
  from: { target: Point; radius: number };
  to: { target: Point; radius: number };
}

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clampRadius = (r: number) => Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, r));

export class OrbitCamera {
  target: Point;
  theta = 0.75;
  phi = 1.02;
  radius: number;
  private anim: Anim | null = null;

  constructor(target: Point, radius: number) {
    this.target = { ...target };
    this.radius = radius;
  }

  get animating(): boolean {
    return this.anim !== null;
  }

  position(): Point {
    const { target: t, theta, phi, radius: r } = this;
    return {
      x: t.x + r * Math.sin(phi) * Math.cos(theta),
      y: t.y + r * Math.cos(phi),
      z: t.z + r * Math.sin(phi) * Math.sin(theta),
    };
  }

  /** Advance any animation to `now`. Returns true while still animating. */
  step(now: number): boolean {
    const a = this.anim;
    if (!a) return false;
    const k = ease(Math.min(1, (now - a.t0) / a.dur));
    this.target = {
      x: a.from.target.x + (a.to.target.x - a.from.target.x) * k,
      y: a.from.target.y + (a.to.target.y - a.from.target.y) * k,
      z: a.from.target.z + (a.to.target.z - a.from.target.z) * k,
    };
    this.radius = a.from.radius + (a.to.radius - a.from.radius) * k;
    if (k >= 1) this.anim = null;
    return this.anim !== null;
  }

  flyTo(target: Point, radius: number, opts: { instant: boolean; now: number; dur?: number }): void {
    if (opts.instant) {
      this.anim = null;
      this.target = { ...target };
      this.radius = clampRadius(radius);
      return;
    }
    this.anim = {
      t0: opts.now,
      dur: opts.dur ?? FLY_MS,
      from: { target: { ...this.target }, radius: this.radius },
      to: { target: { ...target }, radius: clampRadius(radius) },
    };
  }

  zoomBy(factor: number, opts: { instant: boolean; now: number }): void {
    this.flyTo(this.anim?.to.target ?? this.target, (this.anim?.to.radius ?? this.radius) * factor, { ...opts, dur: ZOOM_MS });
  }

  /** Direct manipulation cancels any running animation. */
  orbit(dx: number, dy: number): void {
    this.anim = null;
    this.theta += dx * 0.006;
    this.phi = Math.min(MAX_PHI, Math.max(MIN_PHI, this.phi - dy * 0.006));
  }

  zoomTo(radius: number): void {
    this.anim = null;
    this.radius = clampRadius(radius);
  }
}
