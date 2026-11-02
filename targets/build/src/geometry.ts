// ── Overlay geometry ───────────────────────────────────────────────────
// What a devtools flex overlay shades: on each flex line, the free space
// before the first item, between items, and after the last. Plus anything
// that overflows the container. Pure: boxes in, rectangles out.

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FlexShading {
  /** Unused space on a line (start, end, or between items beyond the gap). */
  free: Box[];
  /** The `gap` itself between neighbours. */
  gaps: Box[];
  /** How far the widest line runs past the content box, 0 if it fits. */
  overflow: number;
}

/** Groups boxes into lines: same top (within `tol` px), in order. */
export function lines(items: readonly Box[], tol = 2): Box[][] {
  const out: Box[][] = [];
  for (const b of items) {
    const line = out.find((l) => Math.abs(l[0]!.y - b.y) <= tol);
    if (line) line.push(b);
    else out.push([b]);
  }
  for (const l of out) l.sort((a, b) => a.x - b.x);
  return out.sort((a, b) => a[0]!.y - b[0]!.y);
}

/**
 * `content` is the container's content box, items are the flex items'
 * layout boxes in the same coordinates, `gap` the column gap in px.
 */
export function flexShading(content: Box, items: readonly Box[], gap: number): FlexShading {
  const free: Box[] = [];
  const gaps: Box[] = [];
  let overflow = 0;
  const right = content.x + content.w;

  for (const line of lines(items)) {
    const top = Math.min(...line.map((b) => b.y));
    const h = Math.max(...line.map((b) => b.y + b.h)) - top;
    const push = (to: Box[], x0: number, x1: number) => {
      if (x1 - x0 >= 1) to.push({ x: x0, y: top, w: x1 - x0, h });
    };
    push(free, content.x, line[0]!.x);
    for (let i = 1; i < line.length; i++) {
      const prevEnd = line[i - 1]!.x + line[i - 1]!.w;
      const start = line[i]!.x;
      const g = Math.min(gap, Math.max(0, start - prevEnd));
      push(gaps, prevEnd, prevEnd + g);
      push(free, prevEnd + g, start);
    }
    const end = line.at(-1)!.x + line.at(-1)!.w;
    push(free, end, right);
    overflow = Math.max(overflow, Math.round(end - right));
  }
  return { free, gaps, overflow: Math.max(0, overflow) };
}

/** "612.4 × 58" the way devtools prints a size: at most two decimals, no trailing zeros. */
export function size(w: number, h: number): string {
  const f = (n: number) => String(Math.round(n * 100) / 100);
  return `${f(w)} × ${f(h)}`;
}

/** "160px 160px 160px" (a computed grid-template-*) → [160, 160, 160]; "none" → []. */
export function parseTracks(value: string): number[] {
  if (!value || value === "none") return [];
  return value
    .split(/\s+/)
    .map((t) => parseFloat(t))
    .filter((n) => Number.isFinite(n));
}

export interface GridLines {
  /** x of column lines 1..n+1 (n tracks). */
  cols: number[];
  /** y of row lines 1..m+1. */
  rows: number[];
  /** Column and row gutters, spanning the grid. */
  gaps: Box[];
}

/**
 * What a devtools grid overlay draws: a line at the start of every track
 * and after the last one, and the gutters between tracks. `content` is the
 * container's content box; track sizes in px.
 */
export function gridLines(content: Box, cols: readonly number[], rows: readonly number[], colGap: number, rowGap: number): GridLines {
  const lines = (start: number, sizes: readonly number[], gap: number) => {
    const out: number[] = [];
    let at = start;
    sizes.forEach((size, i) => {
      out.push(at);
      at += size;
      if (i < sizes.length - 1) at += gap;
    });
    out.push(at);
    return sizes.length ? out : [];
  };
  const xs = lines(content.x, cols, colGap);
  const ys = lines(content.y, rows, rowGap);
  const top = ys[0] ?? content.y;
  const bottom = ys.at(-1) ?? content.y + content.h;
  const left = xs[0] ?? content.x;
  const right = xs.at(-1) ?? content.x + content.w;
  const gaps: Box[] = [];
  if (colGap > 0) for (let i = 1; i < xs.length - 1; i++) gaps.push({ x: xs[i]! - colGap, y: top, w: colGap, h: bottom - top });
  if (rowGap > 0) for (let i = 1; i < ys.length - 1; i++) gaps.push({ x: left, y: ys[i]! - rowGap, w: right - left, h: rowGap });
  return { cols: xs, rows: ys, gaps };
}
