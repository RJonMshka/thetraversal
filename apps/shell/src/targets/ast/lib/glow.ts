// ── Glow color utilities ───────────────────────────────────────────────
// Maps CSS custom property names (from ASTNode.glowColor) to Tailwind
// color classes for borders, text, and shadows.
// Shared between server and client components.

export interface GlowClasses {
  border: string;
  text: string;
  shadow: string;
}

const GLOW_COLOR_MAP: Record<string, GlowClasses> = {
  "--ctp-peach": { border: "border-ctp-peach/30", text: "text-ctp-peach", shadow: "shadow-ctp-peach/10" },
  "--ctp-mauve": { border: "border-ctp-mauve/30", text: "text-ctp-mauve", shadow: "shadow-ctp-mauve/10" },
  "--ctp-lavender": { border: "border-ctp-lavender/30", text: "text-ctp-lavender", shadow: "shadow-ctp-lavender/10" },
  "--ctp-teal": { border: "border-ctp-teal/30", text: "text-ctp-teal", shadow: "shadow-ctp-teal/10" },
  "--ctp-green": { border: "border-ctp-green/30", text: "text-ctp-green", shadow: "shadow-ctp-green/10" },
  "--ctp-yellow": { border: "border-ctp-yellow/30", text: "text-ctp-yellow", shadow: "shadow-ctp-yellow/10" },
  "--ctp-text": { border: "border-ctp-text/20", text: "text-ctp-text", shadow: "shadow-ctp-text/5" },
  "--ctp-red": { border: "border-ctp-red/30", text: "text-ctp-red", shadow: "shadow-ctp-red/10" },
  "--ctp-blue": { border: "border-ctp-blue/30", text: "text-ctp-blue", shadow: "shadow-ctp-blue/10" },
};

const DEFAULT_GLOW: GlowClasses = { border: "border-ctp-text/20", text: "text-ctp-text", shadow: "shadow-ctp-text/5" };

export function getGlowClasses(glowColor: string): GlowClasses {
  return GLOW_COLOR_MAP[glowColor] ?? DEFAULT_GLOW;
}

// ── Glow as a theme-aware CSS color ────────────────────────────────────
// For inline SVG and computed styles (filters, popover borders). Each
// glow name resolves to the semantic theme token it stands for, so the
// AST follows the active theme instead of fixed Catppuccin hex values.

const GLOW_TOKEN: Record<string, string> = {
  "--ctp-text": "var(--tv-text)",
  "--ctp-yellow": "var(--syntax-string)",
  "--ctp-peach": "var(--syntax-ident)",
  "--ctp-mauve": "var(--syntax-keyword)",
  "--ctp-teal": "var(--syntax-type)",
  "--ctp-blue": "var(--syntax-type)",
  "--ctp-lavender": "var(--accent)",
  "--ctp-green": "var(--accent)",
};

export function glowValue(glowColor: string): string {
  return GLOW_TOKEN[glowColor] ?? "var(--tv-text)";
}

/** The glow color at `percent` opacity. */
export function glowTint(glowColor: string, percent: number): string {
  return `color-mix(in srgb, ${glowValue(glowColor)} ${percent}%, transparent)`;
}
