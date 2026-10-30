import type { ThemeSnapshot } from "@tv/contract";
import type { Category } from "@/model";

// ── Palette ────────────────────────────────────────────────────────────
// three.js cannot parse oklch() (the accents in @tv/tokens), so theme
// colors are converted here. Pure: the formats the tokens use are hex,
// rgb()/rgba() and oklch(). Alpha is dropped; the scene sets opacity per
// material. Values are gamma-encoded sRGB in 0..1.

export type RGB = readonly [number, number, number];

export interface Palette {
  bg: RGB;
  text: RGB;
  accent: RGB;
  category: Record<Category, RGB>;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const encode = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);

function oklchToSrgb(L: number, C: number, hDeg: number): RGB {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    clamp01(encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    clamp01(encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    clamp01(encode(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
  ];
}

const num = (s: string) => (s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s));

/** Parses a CSS color as the tokens write them. Returns null for anything else. */
export function parseColor(css: string): RGB | null {
  const c = css.trim().toLowerCase();
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1]!.length === 3 ? [...hex[1]!].map((d) => d + d).join("") : hex[1]!;
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as unknown as RGB;
  }
  const fn = c.match(/^(rgba?|oklch)\(([^)]*)\)$/);
  if (!fn) return null;
  const parts = fn[2]!.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3 || parts.slice(0, 3).some((p) => Number.isNaN(parseFloat(p)))) return null;
  if (fn[1] === "oklch") return oklchToSrgb(num(parts[0]!), parseFloat(parts[1]!), parseFloat(parts[2]!));
  return parts.slice(0, 3).map((p) => clamp01(p.endsWith("%") ? num(p) : parseFloat(p) / 255)) as unknown as RGB;
}

/** Category colors come from the syntax palette; without it (older shell) everything uses the text color. */
export function buildPalette(theme: ThemeSnapshot): Palette {
  const text = parseColor(theme.colors.text) ?? [1, 1, 1];
  const color = (css: string | undefined) => (css && parseColor(css)) || text;
  const s = theme.syntax;
  return {
    bg: parseColor(theme.colors.bg) ?? [0, 0, 0],
    text,
    accent: color(theme.colors.accent),
    category: {
      work: color(s?.ident),
      skills: color(s?.type),
      career: color(s?.string),
      writing: color(s?.keyword),
      self: text,
    },
  };
}
