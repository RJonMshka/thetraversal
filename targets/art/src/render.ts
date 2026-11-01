import { createRng, hashString, pickRoute, pointAt, type Route, type Rng } from "@/flow";
import type { ArtModel, Placed, Point } from "@/model";
import { isLight, rgba, type Palette, type RGB } from "@/palette";

// ── Renderer ───────────────────────────────────────────────────────────
// One 2D canvas, cleared every frame. Animated: each particle is drawn
// with a tail, the stretch of its route just behind it, fading out; tails
// are batched into one path per color and opacity step. (Fading the
// previous frame instead leaves 8-bit ghosts on light themes.) Still
// (reduced motion): the whole flow at once, as faint full-length paths.
// The renderer owns its canvas; nothing else draws on it.

export interface Inset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PieceOptions {
  animate: boolean;
  /** Fewer particles (Save-Data, small screens). */
  lean: boolean;
}

export interface Piece {
  readonly canvas: HTMLCanvasElement;
  resize(width: number, height: number, dpr: number, inset: Inset): void;
  setFocus(id: string | null): void;
  setHover(id: string | null): void;
  setPalette(p: Palette): void;
  /** Screen position (CSS px, relative to the canvas) of an entity. */
  toScreen(id: string): Point | null;
  /** Nearest entity within `slop` CSS px of a point relative to the canvas. */
  pick(x: number, y: number, slop: number): string | null;
  onFrame(fn: () => void): void;
  pause(): void;
  resume(): void;
  dispose(): void;
}

interface Particle {
  route: Route;
  s: number;
  /** Route segments per second. */
  speed: number;
  phase: number;
  wobble: number;
}

const STILL_PATHS = 900;
const SAMPLES_PER_SEGMENT = 10;
const MAX_DT = 50;
/** Tail: samples behind the head, route length per sample, opacity steps. */
const TAIL = 14;
const TAIL_STEP = 0.035;
const STEPS = 4;

export function createPiece(model: ArtModel, placed: ReadonlyMap<string, Placed>, palette: Palette, opts: PieceOptions): Piece {
  const canvas = document.createElement("canvas");
  const g = canvas.getContext("2d", { alpha: false });
  if (!g) throw new Error("2D canvas unavailable");
  const seed = hashString(model.order.join(" "));

  let pal = palette;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let cx = 0;
  let cy = 0;
  let scale = 1;
  let focus: string | null = null;
  let hover: string | null = null;
  let particles: Particle[] = [];
  let rng: Rng = createRng(seed);
  let frame = 0;
  const tails = new Map<string, { color: RGB; alpha: number; path: Path2D }>();
  let last = 0;
  let paused = false;
  let disposed = false;
  const frameListeners: Array<() => void> = [];

  const toPx = (p: Point): Point => ({ x: cx + p.x * scale, y: cy + p.y * scale });
  const capacity = () => {
    const n = Math.round((width * height) / (opts.lean ? 3000 : 1500));
    return Math.min(opts.lean ? 350 : 900, Math.max(150, n));
  };

  function spawn(): Particle {
    const route = pickRoute(model, rng, focus);
    // Staggered start, so a fresh focus does not leave as one wave.
    return { route, s: -rng() * 0.6, speed: 0.45 + rng() * 0.5, phase: rng() * Math.PI * 2, wobble: 0.004 + rng() * 0.018 };
  }

  function colorOf(route: Route): Palette["accent"] {
    if (focus && route.lit) return pal.accent;
    return pal.category[model.nodes.get(route.tint)!.category];
  }

  function alphaOf(route: Route): number {
    if (!focus) return 0.5;
    return route.lit ? 0.85 : 0.16;
  }

  function background(alpha: number) {
    g!.globalCompositeOperation = "source-over";
    g!.fillStyle = rgba(pal.bg, alpha);
    g!.fillRect(0, 0, canvas.width, canvas.height);
  }

  function blend() {
    g!.globalCompositeOperation = isLight(pal.bg) ? "multiply" : "lighter";
  }

  function emitters() {
    g!.globalCompositeOperation = "source-over";
    for (const id of model.order) {
      const n = model.nodes.get(id)!;
      const p = toPx(placed.get(id)!);
      const on = focus ? model.within(id, focus) || id === focus : true;
      const r = (n.depth === 0 ? 3.2 : n.children.length ? 2.2 : 1.6) * dpr;
      g!.fillStyle = rgba(on ? pal.category[n.category] : pal.mute, on ? 0.9 : 0.35);
      g!.beginPath();
      g!.arc(p.x * dpr, p.y * dpr, r, 0, Math.PI * 2);
      g!.fill();
    }
    for (const [id, ring, color] of [
      [focus, 7, pal.accent],
      [hover, 5, pal.text],
    ] as const) {
      if (!id || !placed.has(id)) continue;
      const p = toPx(placed.get(id)!);
      g!.strokeStyle = rgba(color, 0.95);
      g!.lineWidth = 1.25 * dpr;
      g!.beginPath();
      g!.arc(p.x * dpr, p.y * dpr, ring * dpr, 0, Math.PI * 2);
      g!.stroke();
    }
  }

  /** Reduced motion: the whole flow as one still frame. */
  function still() {
    rng = createRng(seed);
    background(1);
    blend();
    g!.lineWidth = 0.8 * dpr;
    for (let i = 0; i < STILL_PATHS; i++) {
      const route = pickRoute(model, rng, focus);
      const phase = rng() * Math.PI * 2;
      const wobble = 0.004 + rng() * 0.018;
      const steps = (route.ids.length - 1) * SAMPLES_PER_SEGMENT;
      g!.strokeStyle = rgba(colorOf(route), alphaOf(route) * 0.35);
      g!.beginPath();
      for (let k = 0; k <= steps; k++) {
        const p = toPx(pointAt(placed, route, k / SAMPLES_PER_SEGMENT, wobble, phase));
        if (k === 0) g!.moveTo(p.x * dpr, p.y * dpr);
        else g!.lineTo(p.x * dpr, p.y * dpr);
      }
      g!.stroke();
    }
    emitters();
    notify();
  }

  function notify() {
    for (const fn of frameListeners.splice(0)) fn();
  }

  function tick(now: number) {
    frame = 0;
    if (paused || disposed) return;
    const dt = last ? Math.min(now - last, MAX_DT) : 16;
    last = now;

    background(1);
    const cap = capacity();
    if (particles.length < cap) for (let i = 0; i < Math.ceil(cap / 60); i++) particles.push(spawn());
    if (particles.length > cap) particles.length = cap;

    tails.clear();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]!;
      p.s += (p.speed * dt) / 1000;
      const end = p.route.ids.length - 1;
      if (p.s - TAIL * TAIL_STEP >= end) {
        particles[i] = spawn();
        continue;
      }
      if (p.s <= 0) continue;
      const color = colorOf(p.route);
      const alpha = alphaOf(p.route);
      const lit = focus && p.route.lit ? "a" : model.nodes.get(p.route.tint)!.category;
      let prev: Point | null = null;
      for (let k = 0; k <= TAIL; k++) {
        const at = p.s - k * TAIL_STEP;
        if (at < 0) break;
        const pt = toPx(pointAt(placed, p.route, Math.min(at, end), p.wobble, p.phase));
        if (prev && at <= end) {
          const step = Math.min(STEPS - 1, Math.floor((k / TAIL) * STEPS));
          const key = `${lit}${alpha}${step}`;
          let t = tails.get(key);
          if (!t) tails.set(key, (t = { color, alpha: alpha * (1 - step / STEPS), path: new Path2D() }));
          t.path.moveTo(prev.x * dpr, prev.y * dpr);
          t.path.lineTo(pt.x * dpr, pt.y * dpr);
        }
        prev = pt;
      }
    }
    blend();
    g!.lineWidth = 1.2 * dpr;
    g!.lineCap = "round";
    for (const t of tails.values()) {
      g!.strokeStyle = rgba(t.color, t.alpha);
      g!.stroke(t.path);
    }
    emitters();
    notify();
    frame = requestAnimationFrame(tick);
  }

  function redraw() {
    if (disposed) return;
    if (!opts.animate) return still();
    if (!frame && !paused) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  }

  return {
    canvas,
    resize(w, h, ratio, inset) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      dpr = Math.min(ratio, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const aw = Math.max(1, width - inset.left - inset.right);
      const ah = Math.max(1, height - inset.top - inset.bottom);
      cx = inset.left + aw / 2;
      cy = inset.top + ah / 2;
      scale = (Math.min(aw, ah) / 2) * 0.86;
      redraw();
    },
    setFocus(id) {
      focus = id && model.nodes.has(id) && id !== model.root ? id : null;
      // New particles follow the focus; the old ones finish their routes.
      if (!opts.animate) redraw();
    },
    setHover(id) {
      hover = id;
      if (!opts.animate) redraw();
    },
    setPalette(p) {
      pal = p;
      redraw();
    },
    toScreen(id) {
      const p = placed.get(id);
      return p ? toPx(p) : null;
    },
    pick(x, y, slop) {
      let best: string | null = null;
      let bestD = slop;
      for (const [id, p] of placed) {
        const s = toPx(p);
        const d = Math.hypot(s.x - x, s.y - y);
        if (d <= bestD) {
          best = id;
          bestD = d;
        }
      }
      return best;
    },
    onFrame(fn) {
      frameListeners.push(fn);
    },
    pause() {
      paused = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    },
    resume() {
      if (!paused) return;
      paused = false;
      if (opts.animate) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      particles = [];
      frameListeners.length = 0;
      canvas.width = 0;
      canvas.height = 0;
      canvas.remove();
    },
  };
}
