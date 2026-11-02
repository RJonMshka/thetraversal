// ── Styles inside the shadow root (LLD-02 §4) ──────────────────────────
// Theme tokens are custom properties on the document's :root and inherit
// into the shadow tree, so every color here is a var(). The devtools
// overlay colors map onto the syntax palette: content → accent, padding →
// string, border → type, margin → keyword. Nothing is added to the document.

const mix = (v: string, pct: number) => `color-mix(in srgb, var(${v}) ${pct}%, transparent)`;
const hatch = (v: string, pct: number, gap: number) =>
  `repeating-linear-gradient(-45deg, ${mix(v, pct)} 0 1px, transparent 1px ${gap}px)`;

const CSS = `
:host { display: block; font-family: var(--mono); color: var(--tv-text); -webkit-font-smoothing: antialiased; }
* { box-sizing: border-box; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
:focus-visible { outline: 1.5px solid var(--accent); outline-offset: 2px; }

.stage { --head: var(--tv-chrome-top, 86px); position: absolute; inset: 0; overflow: hidden; background: var(--ink); }
.scroller { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
.scroller:focus-visible { outline-offset: -2px; }
.ch { position: relative; height: calc(var(--vh, 100vh) * var(--len, 1)); }

.frame {
  position: sticky; top: 0; height: var(--vh, 100vh);
  padding: calc(var(--inset-top, 0px) + var(--head) + 14px) calc(var(--inset-right, 0px) + 20px)
           calc(var(--inset-bottom, 0px) + 40px) calc(var(--inset-left, 0px) + 20px);
  display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px;
}

/* ── The page being built ── */
.page {
  position: relative; min-height: 0; overflow: hidden; border: 1px solid var(--line); background: var(--ink); padding: 40px 44px;
  display: grid; align-content: center;
}
.ov { position: absolute; inset: 0; pointer-events: none; }
.ov > * { position: absolute; left: 0; top: 0; }

.page.top { align-content: start; padding-top: clamp(40px, 9vh, 96px); }
.body { position: relative; min-height: 2em; }
.name { font-family: var(--serif); font-weight: 400; font-size: 52px; line-height: 1.05; margin: 0 0 18px; letter-spacing: -0.01em; }
.summary { font-family: var(--serif); font-size: 20px; line-height: 1.45; color: var(--text-mute); margin: 0 0 14px; max-width: 34em; }
.now { font-size: 13px; color: var(--text-faint); margin: 0 0 26px; }
.links { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 13px; }
.links a { color: var(--accent); text-decoration: none; }
.links a:hover, .links a.is-focus { text-decoration: underline; text-underline-offset: 3px; }
[hidden] { display: none !important; }

.caret { display: inline-block; width: 0.5em; height: 1.05em; margin-left: 1px; vertical-align: -0.15em; background: var(--accent); animation: blink 1s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }

/* box model */
.boxwrap { display: flow-root; width: 100%; max-width: 560px; margin: 8px auto 0; }
.ghost { height: 16px; border-radius: 3px; background: ${mix("--text-faint", 16)}; }
.card {
  padding: var(--pad, 0px); border: var(--bw, 0px) solid var(--line-strong); margin: var(--mar, 0px);
  border-radius: var(--rad, 0px); background: var(--ink-2);
}
.card h2 { font-size: 13px; font-weight: 500; color: var(--syntax-keyword); margin: 0 0 8px; }
.card p { font-family: var(--serif); font-size: 16px; line-height: 1.5; margin: 0; }
.card.is-focus h2 { color: var(--accent); }

/* flex and grid: the real layout (.ghost-layout) is invisible; .live shows it through transforms */
.flexwrap, .gridwrap { position: relative; width: 100%; margin: 8px auto 0; }
.flexwrap { max-width: 520px; }
.gridwrap { max-width: 680px; margin-top: 34px; }
.ghost-layout { visibility: hidden; }
.live {
  position: absolute; inset: 0; list-style: none; margin: 0; padding: 0;
  border: 1px solid var(--line); pointer-events: none;
}
.live > li {
  position: absolute; left: 0; top: 0; pointer-events: auto;
  outline: 1px dashed ${mix("--syntax-type", 55)};
  transition: transform 420ms cubic-bezier(.2,.8,.2,1), width 420ms cubic-bezier(.2,.8,.2,1), height 420ms cubic-bezier(.2,.8,.2,1);
}
.live.instant > li, .still .live > li { transition: none; }
@media (prefers-reduced-motion: reduce) { .live > li { transition: none; } }

.skills { position: relative; list-style: none; margin: 0; padding: 10px; border: 1px solid transparent; gap: var(--gap, 0px); }
.skills[data-display="flex"] { display: flex; }
.skills[data-wrap="wrap"] { flex-wrap: wrap; }
.skills[data-justify="center"] { justify-content: center; }
.skills[data-justify="space-between"] { justify-content: space-between; }
.skills[data-grow="1"] > li { flex-grow: 1; }
.skills:not([data-display="flex"]) > li + li { margin-top: 3px; }
.chip {
  display: block; width: 100%; height: 100%; text-align: left; white-space: nowrap; font-size: 12px; padding: 4px 10px;
  background: var(--ink-2); border: 1px solid var(--line-2);
}
button.chip:hover { border-color: var(--line-strong); }
button.chip.is-focus { border-color: var(--accent); color: var(--accent); }

.projects { position: relative; list-style: none; margin: 0; padding: 0; border: 1px solid transparent; gap: var(--gap, 0px); }
.projects[data-display="grid"] { display: grid; }
.projects[data-cols="2"] { grid-template-columns: 1fr 1fr; }
.projects[data-cols="3"] { grid-template-columns: repeat(3, 1fr); }
.projects[data-span="1"] > li.featured { grid-column: 1 / -1; }
.projects[data-row="1"] > li.featured { grid-row: 1; }
.projects:not([data-display="grid"]) > li + li { margin-top: 4px; }
.projects > li { min-width: 0; }
.proj {
  display: flex; flex-direction: column; gap: 5px; width: 100%; height: 100%; text-align: left;
  padding: 12px 14px; background: var(--ink-2); border: 1px solid var(--line-2); overflow: hidden;
}
button.proj:hover { border-color: var(--line-strong); }
.proj .title { font-family: var(--serif); font-size: 17px; }
.proj .sum { font-size: 12px; line-height: 1.45; color: var(--text-mute); }
.proj .stack { font-size: 11px; color: var(--text-faint); margin-top: auto; }
.live.placed > li.featured .proj { border-color: ${mix("--accent", 60)}; }
.live.placed > li.featured .title { color: var(--accent); }
button.proj.is-focus { border-color: var(--accent); }

/* ── The overlay ── */
.hl { background: ${mix("--accent", 16)}; outline: 1px solid ${mix("--accent", 60)}; }
.box-outline { outline: 1px dashed var(--line-strong); }
.box-outline.flex { outline-color: var(--syntax-type); }
.box-outline.grid { outline-color: var(--syntax-keyword); }
.gline.v { border-left: 1px dashed ${mix("--syntax-keyword", 80)}; }
.gline.h { border-top: 1px dashed ${mix("--syntax-keyword", 80)}; }
.gnum { font-size: 10px; line-height: 1; padding: 2px 4px; background: var(--syntax-keyword); color: var(--ink); }
.gnum.neg { background: var(--ink); color: var(--syntax-keyword); border: 1px solid ${mix("--syntax-keyword", 60)}; padding: 1px 3px; }
.tip {
  white-space: nowrap; font-size: 11px; line-height: 1; padding: 4px 6px;
  background: var(--ink-2); border: 1px solid var(--line-2); color: var(--tv-text);
}
.tip b { color: var(--syntax-keyword); font-weight: 500; }
.tip .dim { color: var(--text-mute); }
.tip.faint { color: var(--text-faint); border-color: var(--line); }
.tip.faint b { color: var(--text-faint); }
.tip.warn { color: var(--syntax-keyword); }
.ring { border-style: solid; border-color: transparent; }
.ring.margin { border-color: ${mix("--syntax-keyword", 30)}; }
.ring.border { border-color: ${mix("--syntax-type", 60)}; }
.ring.padding { border-color: ${mix("--syntax-string", 30)}; }
.ring.content { background: ${mix("--accent", 14)}; }
.hatch.free { background: ${hatch("--syntax-type", 45, 6)}; }
.hatch.gap { background: ${hatch("--syntax-keyword", 70, 3)}; }
.hatch.track-gap { background: ${hatch("--syntax-keyword", 45, 5)}; }
.hatch.over { background: ${hatch("--syntax-keyword", 40, 5)}; }

/* ── The devtools panel ── */
.panel { min-height: 0; display: flex; flex-direction: column; overflow: auto; border: 1px solid var(--line); background: var(--ink-2); font-size: 12px; }
.tabs { display: flex; border-bottom: 1px solid var(--line); flex-shrink: 0; }
.tab { padding: 7px 12px; color: var(--text-faint); }
.tab.on { color: var(--tv-text); box-shadow: inset 0 -2px var(--accent); }
.code { margin: 0; padding: 12px 0; font: inherit; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; }
.ln { display: block; padding: 0 12px; }
.ln.on { background: ${mix("--accent", 14)}; box-shadow: inset 2px 0 var(--accent); }
.t-tag { color: var(--syntax-keyword); }
.t-attr, .t-sel { color: var(--syntax-type); }
.t-str, .t-val { color: var(--syntax-string); }
.t-prop { color: var(--syntax-ident); }
.t-txt { color: var(--tv-text); }
.t-punc { color: var(--text-mute); }
.note { margin: auto 0 0; padding: 10px 12px; color: var(--text-faint); border-top: 1px solid var(--line); line-height: 1.5; }

.bm { margin: 0 12px 12px; font-size: 10px; }
.lvl {
  position: relative; display: grid; grid-template-columns: 30px minmax(0, 1fr) 30px; grid-template-rows: 20px auto 20px;
  align-items: center; text-align: center; border: 1px dashed var(--line-2); color: var(--tv-text);
}
.lvl > .k { position: absolute; left: 5px; top: 4px; color: var(--text-mute); }
.lvl > .t { grid-column: 2; grid-row: 1; }
.lvl > .l { grid-column: 1; grid-row: 2; }
.lvl > .lvl { grid-column: 2; grid-row: 2; }
.lvl > .r { grid-column: 3; grid-row: 2; }
.lvl > .b { grid-column: 2; grid-row: 3; }
.lvl.margin { background: ${mix("--syntax-keyword", 16)}; }
.lvl.border { background: ${mix("--syntax-type", 22)}; border-style: solid; border-color: ${mix("--syntax-type", 50)}; }
.lvl.padding { background: ${mix("--syntax-string", 18)}; }
.lvl.c { display: block; padding: 8px 4px; background: ${mix("--accent", 20)}; border-style: solid; }

/* ── </body>: measured stats and the source ── */
.ch.end {
  display: grid; place-items: center; height: auto; min-height: var(--vh, 100vh);
  padding: calc(var(--inset-top, 0px) + var(--head) + 40px) calc(var(--inset-right, 0px) + 20px) calc(var(--inset-bottom, 0px) + 48px) calc(var(--inset-left, 0px) + 20px);
}
.closing { width: 100%; max-width: 640px; }
.close-tag { font-size: 40px; margin: 0 0 6px; }
.com { margin: 22px 0 10px; font-size: 12px; color: var(--text-faint); }
.stats { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 7px 20px; margin: 0; font-size: 13px; }
.stats dt { color: var(--syntax-ident); }
.stats dd { margin: 0; color: var(--tv-text); }
.stats .dim { color: var(--text-faint); }
.tree { border: 1px solid var(--line); background: var(--ink-2); padding: 10px 0; margin: 0 0 24px; font-size: 12px; white-space: pre; overflow-x: auto; }
.tree .node { display: block; width: 100%; text-align: left; white-space: pre; padding: 0 12px; }
.tree .node:hover, .tree .node.is-focus { background: ${mix("--accent", 12)}; box-shadow: inset 2px 0 var(--accent); }
.cta { font-size: 13px; padding: 8px 14px; border: 1px solid var(--accent); color: var(--accent); }
.cta .dim { color: var(--text-mute); }
.cta:hover { background: ${mix("--accent", 12)}; }

/* the meta line under each panel */
.perf { margin: 0; padding: 7px 12px; border-top: 1px solid var(--line); font-size: 11px; color: var(--text-mute); }
.perf .k { color: var(--syntax-keyword); }
.perf .dim { color: var(--text-faint); }

/* ── Scroll cue: on the empty page until the first scroll ── */
.cue {
  position: absolute; left: 0; right: 0; bottom: 32px; margin: 0; text-align: center; pointer-events: none;
  font-size: 13px; color: var(--tv-text); transition: opacity 300ms ease;
}
.cue .kw { color: var(--accent); }
.cue .sub { display: block; margin-top: 6px; font-size: 11px; color: var(--text-faint); }
.cue .mouse { display: block; position: relative; width: 22px; height: 34px; margin: 0 auto 12px; border: 1.5px solid var(--text-mute); border-radius: 12px; }
.cue .mouse::after {
  content: ""; position: absolute; left: 50%; top: 7px; width: 3px; height: 7px; margin-left: -1.5px;
  border-radius: 2px; background: var(--accent); animation: wheel 1.6s ease-in-out infinite;
}
@keyframes wheel { 0% { transform: translateY(0); opacity: 1; } 70% { transform: translateY(11px); opacity: 0; } 100% { opacity: 0; } }
.scrolled .cue { opacity: 0; }

/* ── Chrome: rail and caption ── */
/* The header is --tv-chrome-top tall: its first row stays empty for the shell's
   "← root" link, switcher and ctx toggle (overlaid on it), the second holds the rail. */
.head {
  position: absolute; left: 0; right: 0; top: var(--inset-top, 0px); height: var(--head);
  background: var(--ink); border-bottom: 1px solid var(--line);
}
.rail {
  position: absolute; left: calc(var(--inset-left, 0px)); right: calc(var(--inset-right, 0px)); bottom: 0; height: 34px;
  display: flex; align-items: center; gap: 4px; padding: 0 16px; border-top: 1px solid var(--line);
}
.rail button { flex-shrink: 0; font-size: 11px; padding: 3px 9px; color: var(--text-mute); border: 1px solid transparent; background: var(--ink); }
.rail button:hover { color: var(--tv-text); }
.rail button.on { color: var(--accent); border-color: var(--line-2); }
.rail .n { color: var(--text-faint); }
.progress { position: absolute; left: 0; right: 0; bottom: -1px; height: 1px; }
.progress > span { display: block; height: 100%; background: var(--accent); transform-origin: 0 0; transform: scaleX(0); }
.caption {
  position: absolute; left: calc(20px + var(--inset-left, 0px)); bottom: calc(12px + var(--inset-bottom, 0px));
  right: calc(20px + var(--inset-right, 0px)); margin: 0; font-size: 11px; color: var(--text-faint);
  pointer-events: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.caption .kw { color: var(--syntax-keyword); }

/* ── Reduced motion: every chapter finished, nothing scrubs ── */
.still .ch { height: auto; }
.still .frame { position: relative; height: auto; min-height: var(--vh, 100vh); }
.still .caret, .still .cue .mouse::after { animation: none; }
@media (prefers-reduced-motion: reduce) { .caret, .cue .mouse::after { animation: none; } }

@media (max-width: 760px) {
  .frame { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) minmax(0, 38%); gap: 10px;
           padding-left: calc(var(--inset-left, 0px) + 16px); padding-right: calc(var(--inset-right, 0px) + 16px); }
  .still .frame { grid-template-rows: auto auto; }
  .page { padding: 22px 18px; }
  .name { font-size: 34px; }
  .summary { font-size: 17px; }
  .bm { display: none; }
  .rail { padding: 0 10px; overflow-x: auto; scrollbar-width: none; }
  .rail button { padding: 3px 7px; }
  .card p { font-size: 14px; }
  .proj .sum { display: none; }
  .proj { padding: 10px; }
  .proj .title { font-size: 15px; }
  .caption .more { display: none; }
  .stats { grid-template-columns: minmax(0, 1fr); gap: 2px; }
  .stats dd { margin-bottom: 8px; }
  .perf .dim { display: none; }
  .caption, .rail button { font-size: 12px; }
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
