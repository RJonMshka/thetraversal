// ── Styles inside the shadow root (LLD-02 §4) ──────────────────────────
// In Phase 3 the AST's utilities are part of the shell's compiled CSS,
// so the target adopts a copy of it. Rules on :root are skipped: theme
// tokens inherit from the document, and Tailwind's `:root, :host` theme
// block would otherwise reset them on the host (e.g. the chosen font).
// Phase 4 replaces this with the target's own stylesheet.

const HOST_RULES = `
:host {
  display: block;
  font-family: var(--font-mono);
  color: var(--tv-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`;

function serialize(rules: CSSRuleList): string {
  let out = "";
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule && rule.selectorText.includes(":root")) continue;
    if (rule instanceof CSSLayerBlockRule) {
      out += `@layer ${rule.name} {${serialize(rule.cssRules)}}\n`;
      continue;
    }
    out += `${rule.cssText}\n`;
  }
  return out;
}

function documentCss(): string {
  let css = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      css += serialize(sheet.cssRules);
    } catch {
      // Cross-origin sheets cannot be read; the shell serves none of these.
    }
  }
  return css;
}

export function adoptStyles(root: ShadowRoot): void {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(documentCss() + HOST_RULES);
  root.adoptedStyleSheets = [sheet];
}
