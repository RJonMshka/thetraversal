import css from "@/styles.css?inline";

// ── Styles inside the shadow root (LLD-02 §4) ──────────────────────────
// The AST's compiled Tailwind ships inside its bundle as a string and is
// adopted into the root it renders in, so nothing is added to the
// document. Theme tokens inherit from the document's :root.

const HOST_RULES = `
:host {
  display: block;
  font-family: var(--mono);
  color: var(--tv-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`;

/**
 * `@property` rules do not register from a shadow root's stylesheets, so
 * Tailwind's `--tw-*` variables (borders, rings, shadows, transforms)
 * would start out unset. Tailwind already ships a fallback for browsers
 * without `@property`: initial values on every element, wrapped in an
 * `@supports` that only matches those browsers. Apply it unconditionally.
 */
export function unwrapPropertyFallback(source: string): string {
  return source.replace(/@supports\s*\(+-webkit-hyphens:\s*none\)[^{]*\{/, "@supports (display: block) {");
}

let shared: CSSStyleSheet | null = null;

export function adoptStyles(root: ShadowRoot): void {
  // One parsed sheet per page, reused by every mount.
  if (!shared) {
    shared = new CSSStyleSheet();
    shared.replaceSync(unwrapPropertyFallback(css) + HOST_RULES);
  }
  root.adoptedStyleSheets = [shared];
}
