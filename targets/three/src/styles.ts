// ── Styles inside the shadow root (LLD-02 §4) ──────────────────────────
// Theme tokens are custom properties on the document's :root and inherit
// into the shadow tree, so every color here is a var(). Nothing is added
// to the document.

const CSS = `
:host {
  display: block;
  font-family: var(--mono);
  color: var(--tv-text);
  -webkit-font-smoothing: antialiased;
}
* { box-sizing: border-box; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
:focus-visible { outline: 1.5px solid var(--accent); outline-offset: 2px; }

.stage { position: absolute; inset: 0; overflow: hidden; background: var(--ink); }
.stage canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }
.stage canvas.picking { cursor: pointer; }
.stage canvas:active { cursor: grabbing; }

.labels { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.lbl {
  position: absolute; left: 0; top: 0; white-space: nowrap; font-size: 11px; line-height: 1;
  color: var(--text-mute); padding: 0 4px; will-change: transform; transition: opacity 150ms;
}
.lbl.hub { color: var(--tv-text); }
.lbl.focus { color: var(--accent); font-weight: 700; }
.lbl.plane { color: var(--text-faint); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
.lbl.plane.on { color: var(--accent); }

.card {
  position: absolute;
  left: calc(14px + var(--inset-left, 0px));
  bottom: calc(14px + var(--inset-bottom, 0px));
  width: min(380px, calc(100% - 28px));
  display: grid; gap: 4px; padding: 10px 12px;
  background: var(--ink-2); border: 1px solid var(--line-2);
  font-size: 12px;
}
.card .path { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 4px; font-size: 11px; color: var(--text-faint); }
.card .path button { color: var(--text-faint); text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
.card .path button:hover { color: var(--accent); text-decoration-color: var(--accent); }
.card .path button[aria-current] { color: var(--text-mute); text-decoration: none; cursor: default; }
.card .head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.card .kind { color: var(--accent); font-size: 11px; }
.card .open { color: var(--text-mute); font-size: 11px; border: 1px solid var(--line-2); padding: 1px 6px; }
.card .open:hover { color: var(--accent); border-color: var(--accent); }
.card h2 { margin: 0; font-size: 16px; font-weight: 500; text-wrap: balance; }
.card p { margin: 0; color: var(--text-mute); }
.card .moves { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.mv {
  display: inline-flex; align-items: center; gap: 6px; max-width: 100%; min-width: 0;
  padding: 2px 8px 2px 4px; border: 1px solid var(--line-2); color: var(--text-mute); font-size: 11px;
}
.mv span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.mv:hover { color: var(--accent); border-color: var(--accent); }
.mv kbd { font: inherit; font-size: 10px; padding: 0 4px; border: 1px solid var(--line-2); color: var(--tv-text); }
.card .hint { color: var(--text-faint); font-size: 11px; }

.legend {
  position: absolute;
  right: calc(14px + var(--inset-right, 0px));
  bottom: calc(14px + var(--inset-bottom, 0px));
  display: grid; gap: 3px; padding: 6px 8px;
  font-size: 11px; color: var(--text-faint);
  background: var(--ink-2); border: 1px solid var(--line);
  pointer-events: none;
}
.legend .c-work { color: var(--syntax-ident); }
.legend .c-skills { color: var(--syntax-type); }
.legend .c-career { color: var(--syntax-string); }
.legend .c-writing { color: var(--syntax-keyword); }
.legend .c-self { color: var(--tv-text); }
.legend .sep { border-top: 1px solid var(--line-2); padding-top: 4px; margin-top: 2px; }
.legend .ln::before {
  content: ""; display: inline-block; width: 14px; border-top: 1px solid currentColor;
  margin-right: 6px; vertical-align: middle;
}
.legend .acc { color: var(--accent); }

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

@media (max-width: 1023px) {
  .legend { display: none; }
  .card .hint { display: none; }
}
/* Phones: the card keeps path, title and moves; the summary is on /node.
   Text stays at 12px or more (legible on a phone; Lighthouse font-size). */
@media (max-width: 640px) {
  .card { left: 8px; bottom: 8px; width: calc(100% - 16px); padding: 8px 10px; gap: 3px; }
  .card p { display: none; }
  .card h2 { font-size: 15px; }
  .lbl, .lbl.plane, .card .path, .card .kind, .card .open, .mv, .mv kbd { font-size: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .lbl { transition: none; }
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
