// ── Styles inside the shadow root (LLD-02 §4) ──────────────────────────
// Theme tokens are custom properties on the document's :root and inherit
// into the shadow tree, so every color here is a var(). Nothing is added
// to the document.

const CSS = `
:host { display: block; font-family: var(--mono); color: var(--tv-text); -webkit-font-smoothing: antialiased; }
* { box-sizing: border-box; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
:focus-visible { outline: 1.5px solid var(--accent); outline-offset: 2px; }

.stage { position: absolute; inset: 0; overflow: hidden; background: var(--ink); }
.stage canvas { display: block; touch-action: manipulation; }
.stage canvas.picking { cursor: pointer; }

.lbl {
  position: absolute; left: 0; top: 0; white-space: nowrap; font-size: 11px; line-height: 1;
  padding: 3px 6px; pointer-events: none; background: var(--ink-2); border: 1px solid var(--line-2);
  color: var(--tv-text); will-change: transform;
}
.lbl[hidden] { display: none; }
.lbl.focus { color: var(--accent); border-color: var(--accent); }
.lbl .open { color: var(--text-mute); margin-left: 6px; }

.caption {
  position: absolute;
  left: calc(14px + var(--inset-left, 0px));
  bottom: calc(12px + var(--inset-bottom, 0px));
  right: calc(14px + var(--inset-right, 0px));
  margin: 0; font-size: 11px; color: var(--text-faint); pointer-events: none;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.caption .kw { color: var(--syntax-keyword); }
.caption .more { color: var(--text-faint); }

@media (max-width: 640px) {
  .caption .more { display: none; }
  .lbl, .caption { font-size: 12px; }
}
`;

let shared: CSSStyleSheet | null = null;

export function adoptStyles(root: ShadowRoot): void {
  // One parsed sheet per page, reused by every mount.
  if (!shared) {
    shared = new CSSStyleSheet();
    shared.replaceSync(CSS);
  }
  root.adoptedStyleSheets = [shared];
}
