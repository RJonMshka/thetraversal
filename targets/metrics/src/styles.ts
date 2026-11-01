// ── Styles inside the shadow root (LLD-02 §4) ──────────────────────────
// Theme tokens are custom properties on the document's :root and inherit
// into the shadow tree, so every color here is a var(). The header is
// --tv-chrome-top tall: its first row is left empty for the shell's
// "← root" link, switcher and ctx toggle, which are overlaid on it.

const CSS = `
:host { display: block; font-family: var(--mono); color: var(--tv-text); -webkit-font-smoothing: antialiased; }
* { box-sizing: border-box; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
:focus-visible { outline: 1.5px solid var(--accent); outline-offset: 2px; }

.host { position: absolute; inset: 0; background: var(--ink); }
.app { display: flex; flex-direction: column; height: 100%; }

.head { flex: none; height: var(--tv-chrome-top); display: flex; flex-direction: column; border-bottom: 1px solid var(--line); }
.chrome { flex: 1; }
.band {
  height: 34px; display: flex; align-items: center; justify-content: center; padding: 0 16px;
  border-top: 1px solid var(--line); font-size: 11px; letter-spacing: .04em; color: var(--text-mute);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.acc { color: var(--accent); margin-right: 6px; }
.kw { color: var(--syntax-keyword); }

.body {
  flex: 1; min-height: 0; overflow-y: auto;
  padding: 20px calc(20px + var(--inset-right, 0px)) 32px 20px;
  display: grid; gap: 28px; align-content: start;
}
section { display: grid; gap: 12px; max-width: 1100px; width: 100%; margin: 0 auto; }

.title { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
h1 { margin: 0; font-size: 18px; font-weight: 500; }
h2 { margin: 0; font-size: 13px; font-weight: 500; color: var(--text-mute); text-transform: lowercase; }
.back {
  display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-mute);
  border: 1px solid var(--line-2); padding: 3px 8px;
}
.back:hover { color: var(--accent); border-color: var(--accent); }
kbd { font: inherit; font-size: 11px; padding: 0 4px; border: 1px solid var(--line-2); color: var(--tv-text); }

.stats { display: flex; flex-wrap: wrap; gap: 6px 24px; margin: 0; font-size: 12px; }
.stats div { display: flex; gap: 8px; }
.stats dt { color: var(--text-mute); }
.stats dd { margin: 0; color: var(--tv-text); font-variant-numeric: tabular-nums; }
.stats dd.bad { color: var(--syntax-keyword); }
.note { margin: 0; font-size: 12px; color: var(--text-mute); }

.tools { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.filters { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-size: 12px; color: var(--text-mute); border: 1px solid var(--line-2); padding: 2px 8px; }
.chip:hover { color: var(--tv-text); border-color: var(--line-strong); }
.chip[aria-pressed="true"] { color: var(--accent); border-color: var(--accent); background: var(--accent-faint); }
.chip.focus { color: var(--tv-text); }
.chip.focus:hover { color: var(--accent); border-color: var(--accent); }

.scroll { overflow-x: auto; border: 1px solid var(--line); background: var(--ink-2); }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
caption { caption-side: top; text-align: left; padding: 8px 10px; color: var(--text-mute); border-bottom: 1px solid var(--line); }
th { text-align: left; font-weight: 400; color: var(--text-mute); padding: 6px 10px; border-bottom: 1px solid var(--line); }
td { padding: 5px 10px; border-bottom: 1px solid var(--line); vertical-align: baseline; }
tbody tr:last-child td { border-bottom: 0; }
.c-t { color: var(--text-mute); white-space: nowrap; font-variant-numeric: tabular-nums; }
.c-name { white-space: nowrap; color: var(--syntax-type); }
.c-target { color: var(--text-mute); white-space: nowrap; }
.c-detail { color: var(--text-mute); }
.c-detail .bar { margin-right: 8px; vertical-align: middle; }
tr.latest td { background: var(--accent-faint); }
tr.latest .c-detail, tr.latest .c-t { color: var(--tv-text); }
.now { color: var(--accent); }
tr.hl td:first-child { box-shadow: inset 2px 0 0 var(--accent); }
tr.hl .c-target { color: var(--accent); }
tr.failed .c-name, tr.failed .c-detail { color: var(--syntax-keyword); }
.empty { color: var(--text-mute); text-align: center; padding: 16px; }

.seg-manifest { fill: var(--syntax-type); background: var(--syntax-type); }
.seg-entry { fill: var(--syntax-ident); background: var(--syntax-ident); }
.seg-mount { fill: var(--syntax-string); background: var(--syntax-string); }
.seg-ready { fill: var(--accent); background: var(--accent); }
.legend { margin: 0; font-size: 11px; color: var(--text-mute); }
.sw { display: inline-block; width: 10px; height: 6px; margin: 0 4px 0 10px; vertical-align: middle; }
.sw:first-child { margin-left: 0; }

.later { border-top: 1px solid var(--line); padding-top: 16px; }
.later p { margin: 0; font-size: 12px; color: var(--text-mute); max-width: 72ch; line-height: 1.6; }

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* Phones: the target column folds away (the event names say enough). Text
   stays at 12px or more. */
@media (max-width: 640px) {
  .body { padding: 16px 12px 24px; }
  .c-target { display: none; }
  .band { font-size: 12px; }
  .band .more { display: none; }
  .legend, kbd { font-size: 12px; }
  .c-detail .bar { display: none; }
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
