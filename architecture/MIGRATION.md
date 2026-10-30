# Migration Plan

From a single Next.js app to the IR + shell + targets platform described in `HLD.md`.

Rules for every phase:
- Work on a branch named `platform/phase-<n>`. Merge only when every exit criterion holds.
- Production stays live and unchanged in behavior until a phase deliberately changes behavior.
- Each phase ends with `CLAUDE.md` §2 updated and the checklist below ticked in the same PR.
- If a step reveals the docs are wrong, fix the doc in the PR rather than working around it.

Each phase has a **prompt for Claude Code** you can paste to start it.

---

## Phase 0: Baseline

**Goal:** know exactly what "unchanged" means before anything moves.

Steps
- [x] Add `CLAUDE.md` at repo root. Replace `AGENTS.md` content with a single line: `See CLAUDE.md.` (keeps other agents pointed at one source).
- [x] Add `architecture/` with HLD, LLDs, and this file.
- [x] Install Playwright as a dev dependency. Add `e2e/parity.spec.ts` capturing screenshots of: `/`, `/tree?mode=lex`, `/tree?mode=parse`, `/tree?mode=eval`, `/node/reachble`, `/node/rewiring-the-interface`, `/node/timeline-0`, at 1440×900 and 390×844, in the `mint` and `paper` themes. Disable animations for capture (`prefers-reduced-motion: reduce` + `animations: "disabled"`).
- [x] Record baselines in `architecture/baseline.md`: first-load JS per route from `next build` output, Lighthouse scores for `/` and `/node/reachble`, number of statically generated `/node/*` pages.
- [x] Add a `pnpm e2e` script.

Exit criteria
- Parity snapshots committed and passing against the current build.
- `architecture/baseline.md` filled with real numbers.

Prompt for Claude Code
> Read CLAUDE.md and architecture/MIGRATION.md. Execute Phase 0 exactly as listed. Do not change application code. When done, report the baseline numbers and confirm parity snapshots pass twice in a row.

---

## Phase 1: Monorepo conversion

**Goal:** same app, new home. Zero behavior change.

Steps
- [x] `git mv` app files into `apps/shell/`: `src/`, `public/`, `next.config.ts`, `next-env.d.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `.vscode/` stays at root. Use `git mv` so history follows.
- [x] Split `package.json`: root keeps `packageManager`, adds `turbo` dev dependency and scripts (`dev`, `build`, `lint`, `type-check`, `test`, `e2e` calling `turbo run …`). `apps/shell/package.json` gets the current dependencies and scripts, name `@tv/shell`.
- [x] Add `pnpm-workspace.yaml` and `turbo.json` (LLD-04 §2). Add `packages/tsconfig` with a `base.json`; `apps/shell/tsconfig.json` extends it and keeps `@/*` → `./src/*`.
- [x] Remove the stray `.DS_Store` files and add `.DS_Store` to `.gitignore`.
- [x] Regenerate the lockfile with `pnpm install` from root.
- [x] Move `e2e/` to `apps/shell/e2e/` or keep at root with a Playwright config that starts `@tv/shell`. Pick root; it will test the whole platform later.
- [x] Vercel: create a temporary project from the branch with root directory `apps/shell`. Confirm deploy and parity against it. At merge time, change the production project's root directory to `apps/shell`, then merge.
  - [x] Temporary project deployed (https://thetraversal-phase1.vercel.app); routes, HTML and 28 parity snapshots match (baseline.md "Vercel preview").
  - [x] Production project root directory set to `apps/shell`, branch merged, production verified (baseline.md "Production cutover").

Exit criteria
- `pnpm build` from root produces the same route table and first-load sizes as baseline (±1 KB).
- Parity snapshots pass.
- Production deploy from `apps/shell` serves identical pages.

Rollback: revert the merge commit and reset the Vercel root directory to `/`.

Prompt for Claude Code
> Read CLAUDE.md and architecture/lld/04-build-deploy.md §1-2. Execute Phase 1 from architecture/MIGRATION.md. Use git mv for every move. Do not modify any file under src/ except where a path in config must change. Stop before the Vercel step and tell me what to click.

---

## Phase 2: Content IR

**Goal:** the IR becomes the source of data. Every existing consumer keeps working through the `@/data` facade.

Steps
- [x] Create `packages/ir` with `schema.ts`, `compiler/`, `client.ts` per LLD-01. Add `zod`, `@mdx-js/mdx`, `rehype-sanitize`; reuse existing `remark-gfm`, `rehype-pretty-code`, `shiki`.
- [x] Copy (not move yet) `apps/shell/src/data/*.ts` to `apps/shell/src/data/legacy/` untouched. This is the golden reference.
- [x] Create `content/registry/*.ts` from the legacy registries, converting each entry to an `Entity`: AST `type` becomes `kind` (mapping in LLD-01 §7), `meta.params` becomes `stack`, `content.deep` becomes `essayRef`, `publish` becomes `status`, drop `glowColor`. The inline `content.body` becomes `excerpt` (it still feeds the client tree), so the golden test can compare full trees.
- [x] Add `content/registry/relations.ts` with the cross-links (thesis triangle: `mfkit implements rewiring-the-interface`, `kata implements rewiring-the-interface`; the Kata edge is dropped with a warning while Kata is a draft).
- [x] `git mv apps/shell/src/content content/mdx` and update the compiler paths. `loadNodeContent` and `loadEssay` now read from the IR bodies instead (done together with the renderer switch below, so no commit renders HTML as text).
- [x] Compile MDX to sanitized HTML in the IR build. Move element styles from `mdx-components.tsx` into `packages/tokens/prose.css` (create `packages/tokens` now with just this file and `themes.ts` moved from `src/lib/themes.ts`; leave a re-export at the old path).
- [x] Write `apps/shell/src/data/projection.ts` (`toAST`).
- [x] Reimplement `apps/shell/src/data/index.ts` over `createIRClient(graph)` + `toAST`. Keep every exported function signature identical. The 13 consumers do not change.
- [x] Add `ir-parity.test.ts` (LLD-01 §8). Fix projection tables until it passes. Do not special-case ids.
- [x] `/node/[slug]/page.tsx`: render `body.html` inside `.tv-prose` instead of `MDXRemote` (in `PhilosophyNode` and wherever bodies render). Keep dispatching node components on the projected AST type for now; the switch to `kind` happens in Phase 3 when AST types leave the shell.
- [x] Wire `@tv/ir#build` before `@tv/shell#build` in Turborepo; emit `public/ir/v1/*`.
- [x] When parity holds: delete `src/data/legacy/`, `next-mdx-remote`, `gray-matter`, and `src/lib/mdx.ts`. (The golden test passed at `41286ae`; it now checks projection invariants against the graph. `remark-gfm`, `rehype-pretty-code` and `shiki` also left the shell, they live in `@tv/ir`.)

Exit criteria
- Golden test passed before legacy deletion (keep the commit where it passes in history).
- Parity snapshots pass. Essay pages render identically, including code highlighting.
- Same number of statically generated `/node/*` pages as baseline.
- IR integrity checks pass; graph under 60 KB gzipped.
- Publishing a project is still a one-line change.

Risks
- Glow colors that differ within a kind. Resolve in the projection or with a semantic `accent` field (LLD-01 §8).
- Sanitizer stripping shiki markup. Allowlist `span[style]`, `pre[data-*]`, `code[data-*]`, heading `id`s.

Prompt for Claude Code
> Read CLAUDE.md and architecture/lld/01-content-ir.md fully. Execute Phase 2 from architecture/MIGRATION.md in the listed order. Commit after each checkbox. Do not delete the legacy data until the golden parity test passes; show me the passing test output before deleting.

---

## Phase 3: Contract, host, and AST as a local target

**Goal:** the shell mounts the AST only through the contract. Federation is not involved yet, so contract problems surface without network problems.

Steps
- [x] Create `packages/contract` (LLD-02) with types, `createBus`, `satisfiesRange`, error codes.
- [x] Finish `packages/tokens`: `tokens.css` holding the variable blocks currently in `globals.css`, plus a `themeSnapshot()` helper. `globals.css` imports it.
- [x] Shell platform (LLD-03 §2): `registry.ts` with `ast` only, `loader/local.ts` (dynamic `import()` of an in-bundle module), `host/TargetHost.tsx`, `host/context.ts`, `focus.ts`, `bus.ts`, `capabilities.ts`, `errors.ts`, `chrome/Outline.tsx`, `chrome/TargetSwitcher.tsx` (shows one option for now).
- [x] Route `app/t/[target]/page.tsx`. Redirect `/tree` → `/t/ast` (query preserved). Update landing links to `/t/ast?mode=…`.
- [x] Split `useTraversalState`: `visitedNodes` and `contextWindow` to `state/shell-store.ts`; `currentMode` and `expandedNodes` into the AST target via `ctx.params` / `ctx.storage`.
- [x] Move AST code into `apps/shell/src/targets/ast/`: `components/ast/*`, `TokenStream`, `useASTLayout`, `useStackOverflow`, `node-dimensions.ts`, `glow.ts`, `traversal.ts`, `ast-types.ts`, `projection.ts`, and the body of `app/tree/page.tsx` as `AstApp.tsx`.
- [x] Write `targets/ast/mount.tsx`: `createRoot(shadowRoot)` rendering `AstApp` with `ctx`. Adopt the AST's compiled CSS into the shadow root.
- [x] Replace the `next/link` (4 files) and `next/navigation` (4 files) imports inside the moved code with an `AstNav` adapter over `ctx.nav` (`<a href>` with `onClick` → `ctx.nav.focus` or `ctx.nav.open`). Replace `next/dynamic` in `ASTCanvasLazy` with `React.lazy`.
- [x] Replace the hex `GLOW_COLORS` map in `ASTNode.tsx` with token variables read through `ctx.theme` or CSS vars. (The same map was also copied into `NodeContentPopover.tsx` and `NodeInspector.tsx`; all three now use `glowValue`/`glowTint` in `targets/ast/lib/glow.ts`.)
- [x] `ContextWindow` moves to shell chrome and reads the shell store. Shell-store entries store `kind` instead of `ASTNodeType` + `glowColor`.
- [x] Shell stops depending on AST vocabulary. Today `components/nodes/*`, `ContextWindow`, `NodeShell`, and `app/node/[slug]/page.tsx` import `@/lib/ast-types`, and `IdentityNode`, `ContextWindow`, `ASTMobileTree` import `@/lib/glow`. Convert the node components to take `Entity` props and dispatch on `kind`. Add `apps/shell/src/lib/kind-accent.ts` (kind → accent token) for shell chrome; the AST keeps its own glow mapping in its projection.
- [x] Retire the `@/data` facade: remaining shell consumers (landing `getNodeCount`/`getTreeMaxDepth`, `sitemap.ts`, node pages, `easter-eggs.ts`) use the `IRClient` directly. `traversal.ts` and its test move with the AST target.
- [x] Add the Phase 3 lint boundary (LLD-04 §8) on `src/targets/ast/**`.
- [x] Audit moved AST code for `document`/`window` use and portals. Scope listeners to the shadow root host or `ctx.signal`, and make sure all are removed on unmount. (`ReadingProgress` is used by node pages and stays in the shell.) Result: no portals and no writes outside the root; `matchMedia` listeners, the drift `rAF` loop and d3-zoom handlers were already released on unmount; the stack-overflow timer and in-flight d3 pan transitions now are too.

Exit criteria (all met; see baseline.md "Phase 3")
- `/t/ast?mode=lex|parse|eval` matches the Phase 0 `/tree?mode=…` snapshots (allow the URL difference only).
- `/tree?mode=eval` returns 308 to `/t/ast?mode=eval`.
- Lint boundary passes: nothing under `targets/ast` imports `next/*`, `@/data`, or the shell store.
- Mount, unmount, mount again in the same page works (add a dev-only `?remount=1` toggle to test).
- Context window shows visits from both `/t/ast` and `/node/*`.

Prompt for Claude Code
> Read CLAUDE.md, architecture/lld/02-target-contract.md and architecture/lld/03-shell-runtime.md. Execute Phase 3 from architecture/MIGRATION.md. The AST must only reach the shell through TargetContext. Start with packages/contract and the host, then move AST code in one commit with no behavior changes, then replace Next imports in a separate commit.

---

## Phase 4: Federate the AST

**Goal:** the AST target builds and deploys independently, loaded at runtime from its own Vercel project.

Steps
- [x] Create `packages/target-kit`: standalone harness and conformance runner (LLD-02 §7, LLD-04 §7). Also holds `tvTarget()`, the Vite plugin set every target uses (LLD-04 §3).
- [x] `git mv apps/shell/src/targets/ast targets/ast`. New `package.json` (`@tv/target-ast`), `vite.config.ts` with `@module-federation/vite`, `base: "/_t/ast/"`, port 5101 (LLD-04 §3). Tailwind v4 via `@tailwindcss/vite`. (Moved to `targets/ast/src/`; the shared Tailwind theme moved from the shell's `globals.css` to `@tv/tokens/tailwind.css`.)
- [x] Add `target.config.ts` and the postbuild that writes `manifest.json` (`a11y: "full"`, `motion: "reduced-variant"`, `urlParams: ["mode"]`, budget from baseline tree-page JS). (`tvTarget()` emits it during the build instead of a postbuild script. Budget 180 KB: the AST now bundles its own React and Framer, see baseline.md "Phase 4".)
- [x] Shell: add `loader/mf.ts`, switch `ast` to `mf`, keep `local.ts` deleted after this phase. Add rewrites (LLD-04 §4).
- [ ] Vercel project `thetraversal-t-ast`, root `targets/ast`, `turbo-ignore`, cache headers. Set `TARGET_AST_ORIGIN` on the shell project. (`targets/ast/vercel.json` holds the build, ignore step and headers; the projects and env var are set up by hand.)
- [x] CSP in report-only mode (LLD-04 §6).
- [x] CI: conformance job and e2e job (LLD-04 §7). (`.github/workflows/ci.yml`; not yet run on GitHub.)
- [ ] Failure drill: point `TARGET_AST_ORIGIN` at a dead URL on a preview. Expect the outline, a `T0004` diagnostic, and no blank page. (Passes locally with the target server stopped; the preview run waits for the Vercel projects.)

Exit criteria
- A commit touching only `targets/ast` deploys only `thetraversal-t-ast`, and production picks it up without a shell deploy.
- Conformance passes. Parity snapshots pass on `/t/ast`.
- Shell first-load JS drops below 150 KB gzipped; AST target within its budget. (Not reachable in this phase: React DOM and the Next runtime alone are ~150 KB. See baseline.md "Phase 4".)
- Failure drill passes.

Prompt for Claude Code
> Read CLAUDE.md and architecture/lld/04-build-deploy.md. Execute Phase 4 from architecture/MIGRATION.md. Before writing loader/mf.ts, check the installed @module-federation/runtime version's exports and adapt the LLD-03 §4 sketch to the real API. Stop before Vercel steps and list what I need to configure.

---

## Phase 5: `three` target

**Goal:** second target, no React, proves the contract is real.

Steps
- [ ] Scaffold `targets/three` (vanilla TS, `three`, `d3-force-3d` for layout). Manifest: `capabilities: ["webgl2"]`, `a11y: "partial"`, `motion: "static-fallback"`, `urlParams: []`.
- [ ] Scene: entities as nodes sized by kind, `contains` edges as faint lines, `implements`/`uses` edges as accent lines. Labels via instanced sprites or a CSS2D layer inside the shadow root.
- [ ] Focus: camera fly-to over 600 ms (instant with reduced motion); picking calls `ctx.nav.focus`. Double-click or Enter calls `ctx.nav.open`.
- [ ] Theme: palette from `ctx.theme.colors`, updated in `onTheme`.
- [ ] Lifecycle: `suspend` stops the render loop; `unmount` disposes geometries, materials, textures, renderer, and forces context loss.
- [ ] Shell: `AccessibleEntityList` rendered beside partial targets, synced with focus.
- [ ] Switcher shows `--target=ast` and `--target=three`; prefetch on hover.

Exit criteria
- Switch ast ⇄ three preserves focus both ways; warm switch p75 under 400 ms locally with prefetch.
- Conformance passes, including remount and zero canvases after unmount.
- Keyboard-only user can traverse every entity via the accessible list while `three` is active.

---

## Phase 6: Telemetry and `metrics`

Follow `lld/05-telemetry.md` §7: 6a client pipeline + `live()` + "This session" panel; 6b ingest, store, summary API, remaining panels, footer disclosure.

Exit criteria: dashboard shows the visitor's own load of the dashboard as the latest live event; with the store connected, p75 load per target over 7 days renders from real data.

---

## Phase 7: `art` target

Generative piece driven by the IR (for example: entities as particle emitters, `contains` depth as layer, relations as attractors). `motion: "static-fallback"` renders a single still frame under reduced motion. `a11y: "decorative"` with the accessible list.

---

## Phase 8: `llm` target

- Capability `llm`. Shell route `/api/llm` streams from the Claude API with the IR (graph + requested bodies) as the corpus. API key server-side only.
- Model tools mapped to `ctx.nav`: `focus(id)`, `switch_target(id, focus)`, `open(id)`. Every tool call is validated against the IR before execution, and the shell, not the model, performs the navigation.
- This is where the thesis from "Rewiring the Interface" becomes concrete: structured, schema-constrained generative UI over a deterministic platform. Link the target to `/node/rewiring-the-interface`.

---

## After each phase

- Update `CLAUDE.md` §2 phase marker.
- Re-run Lighthouse and record in `architecture/baseline.md` under a new heading.
- Add or update the `thetraversal` project entry so the portfolio describes its own current architecture.
