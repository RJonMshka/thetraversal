# Baseline

What "unchanged" means for later phases. Re-measure after each phase and add a new section; never edit an old one.

## Phase 0 (2026-10-29)

Commit: `platform/phase-0`, single Next.js app at repo root. Next.js 16.2.1 (Turbopack), measured on macOS (darwin), local production build.

### Build

- `pnpm build`: passes. 118 static pages generated.
- Statically generated `/node/*` pages: **112**.
- Other routes: `/` (static), `/tree` (static), `/_not-found`, `/robots.txt`, `/sitemap.xml` (static), `/opengraph-image` (dynamic, edge).

### First-load JS (gzipped)

Next 16 with Turbopack no longer prints first-load sizes, so this comes from `pnpm measure:first-load` (`scripts/measure-first-load.mjs`): the gzipped sum of every `/_next/static/*.js` the prerendered HTML references. Lazy chunks (D3 canvas, etc.) are excluded.

| Route | KB gz | Chunks |
|---|---:|---:|
| `/` | 265.1 | 13 |
| `/tree` | 270.5 | 14 |
| `/node/reachble` | 246.3 | 12 |
| `/node/rewiring-the-interface` | 246.3 | 12 |
| `/node/timeline-0` | 246.3 | 12 |

Every route is already over the 200 KB single-app budget. Phase 1's "±1 KB" check compares against these numbers.

### Lighthouse

Lighthouse 12.8.2, default mobile config (simulated throttling), headless Chrome against `pnpm start` on localhost.

| Page | Perf | A11y | Best practices | SEO | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` | 88 | 89 | 93 | 100 | 3.8 s | 30 ms | 0.026 |
| `/node/reachble` | 88 | 95 | 96 | 100 | 4.0 s | 20 ms | 0 |

Failing audits:
- `/`: `aria-allowed-attr`, `color-contrast`, `font-size` (57.7% legible text), `errors-in-console`, `largest-contentful-paint`.
- `/node/reachble`: `color-contrast`, `errors-in-console`, `largest-contentful-paint`.
- `errors-in-console` is a 404 for `/_vercel/insights/script.js`, which only exists on Vercel. It is a local-only failure.

These are below the quality bar in `CLAUDE.md` §8 (≥95 / 100 / 100 / 100). The bar is a goal, not the current state.

### Lint

`pnpm lint` (`eslint .`, ESLint 9, `eslint-config-next/core-web-vitals`): **14 errors, 4 warnings**, all in existing app code.

| Rule | Files |
|---|---|
| `react/jsx-no-comment-textnodes` (error) | `app/not-found.tsx`, `app/page.tsx`, `ast/ASTEvalView.tsx`, `ast/ASTLexView.tsx`, `chrome/EasterEggOverlays.tsx`, `nodes/NodeShell.tsx` |
| `react-hooks/immutability` (error) | `app/tree/page.tsx` |
| `react-hooks/refs` (error) | `ast/ASTCanvas.tsx`, `ast/ASTEdge.tsx` |
| `react-hooks/set-state-in-effect` (error) | `landing/ParseAnimation.tsx` |
| `react-hooks/exhaustive-deps` (warn) | `ast/ASTCanvas.tsx` |
| `jsx-a11y/role-has-required-aria-props` (warn) | `ast/ASTMobileTree.tsx` |
| `jsx-a11y/role-supports-aria-props` (warn) | `landing/Cursor.tsx` |
| unused disable directive (warn) | `ast/NodeContentPopover.tsx` |

Before Phase 0, `pnpm lint` could not run at all: `next lint` was removed in Next 16, and the plugins in `eslint-config-next` did not load under ESLint 10. Phase 0 changed tooling only (script, flat config, ESLint 9) and left these findings in place.

### Other checks

- `pnpm type-check`: passes.
- `pnpm test`: 1 file, 35 tests, all pass.

### Visual parity

`pnpm e2e` (`e2e/parity.spec.ts`): 7 routes × 2 themes (`mint`, `paper`) × 2 viewports (1440×900, 390×844) = **28 snapshots**, passed twice in a row against the production build.

Capture settings: `reducedMotion: "reduce"`, `animations: "disabled"`, full page, theme set via the `tv.theme.cmd` localStorage key.

Known gaps:
- The token stream on `/tree` is masked. It drifts on a `requestAnimationFrame` loop that ignores `prefers-reduced-motion`, which also breaks the reduced-motion rule in `CLAUDE.md` §8. (Fixed below.)
- Snapshots are darwin-only (`*-darwin.png`). CI on Linux (Phase 4) needs its own baselines, recorded with `pnpm e2e:update` from the parity commit.
- `/tree?mode=*` modes are client-side, so their first-load JS is the same as `/tree`.

## Phase 0 fixes (2026-10-29)

Lint and reduced-motion fixes, no intended visual change. All 28 parity snapshots passed against the fixed build before any snapshot was updated.

### Changes

- Lint: 14 errors and 4 warnings to **0**.
  - `// …` labels in JSX wrapped as string literals (same rendered text).
  - `app/tree/page.tsx`: `selectedNodeSlug` state declared before the callback that uses it.
  - `ASTCanvas.tsx`: `transformRef` synced in a layout effect, not during render; the one-time zoom-to-fit flag is a ref; stable empty `expandedNodes` before hydration.
  - `ASTEdge.tsx`: spring targets set in a layout effect instead of during render.
  - `ParseAnimation.tsx`: phase resets moved into the timers the effects already schedule.
  - `Cursor.tsx`: the terminal input is `role="combobox"` with `aria-controls` on its listbox.
  - `ASTMobileTree.tsx`: `aria-selected={false}` on tree items.
- `TokenStream.tsx` honors `prefers-reduced-motion`: no drift, fling, or opacity breathing, and snapping to the active token is instant. Dragging still works. With reduced motion on, it also no longer re-renders every frame.
- `e2e/parity.spec.ts` no longer masks the token stream. The 12 `/tree` snapshots were re-recorded to include it; the other 16 are unchanged.

### Lighthouse

Same setup as above.

| Page | Perf | A11y | Best practices | SEO | LCP |
|---|---:|---:|---:|---:|---:|
| `/` | 94 | 95 | 96 | 100 | 3.1 s |
| `/node/reachble` | 93 | 95 | 96 | 100 | 3.2 s |

- `/` accessibility 89 → 95: the `aria-allowed-attr` failure (on the terminal input) is fixed.
- Performance moved 88 → 93–94 on both pages. None of the fixes target load performance, so treat most of this as run-to-run variance.
- Still failing: `color-contrast` (both), `largest-contentful-paint` (both), and the local-only `errors-in-console` (Vercel Analytics 404).

### First-load JS

Unchanged within 0.1 KB (`/` 265.2, `/tree` 270.6, node pages 246.3 KB gz).

## Phase 1 (2026-10-29)

Commit: `platform/phase-1`. The app moved to `apps/shell/` (`@tv/shell`) inside a pnpm workspace with Turborepo 2.11.10 at the root. No change under `src/`. Same machine and Next.js 16.2.1 as Phase 0. All commands run from the repo root.

### Build

- `pnpm build` (`turbo run build` → `@tv/shell#build`): passes, no warnings. 118 static pages generated.
- Statically generated `/node/*` pages: **112**.
- Route table is the same as Phase 0: `/` (static), `/tree` (static), `/node/[slug]` (SSG), `/_not-found`, `/robots.txt`, `/sitemap.xml` (static), `/opengraph-image` (dynamic).

### First-load JS (gzipped)

`pnpm measure:first-load` (now reads `apps/shell/.next`).

| Route | KB gz | Chunks |
|---|---:|---:|
| `/` | 265.2 | 13 |
| `/tree` | 270.6 | 14 |
| `/node/reachble` | 246.3 | 12 |
| `/node/rewiring-the-interface` | 246.3 | 12 |
| `/node/timeline-0` | 246.3 | 12 |

Identical to "Phase 0 fixes". Still over the 200 KB budget (deferred).

### Lighthouse

Same setup as Phase 0 (Lighthouse 12.8.2, default mobile, headless Chrome against `pnpm --filter @tv/shell start`).

| Page | Perf | A11y | Best practices | SEO | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` | 94 | 95 | 96 | 100 | 3.1 s | 20 ms | 0 |
| `/node/reachble` | 95 | 95 | 96 | 100 | 2.9 s | 10 ms | 0 |

Same failing audits as "Phase 0 fixes": `color-contrast`, `largest-contentful-paint` (both deferred), and the local-only `errors-in-console`. The `/node/reachble` performance change (93 → 95) is run-to-run variance.

### Other checks

- `pnpm lint`: 0 problems. `pnpm type-check`: passes. `pnpm test`: 1 file, 35 tests, all pass.
- `pnpm e2e`: 28 parity snapshots passed twice in a row. No snapshot was re-recorded.

### Notes

- Effective TypeScript compiler options for the shell are unchanged (`tsc --showConfig` diff is ordering only). `apps/shell/tsconfig.json` extends `@tv/tsconfig/base.json`.
- `pnpm-workspace.yaml` publicly hoists `@types/react` and `@types/react-dom`. Without it, Next's own type definitions (resolved from `node_modules/.pnpm`) cannot find React types, and React event handler params in the shell become implicit `any`, which fails the build.
- Lockfile: the only resolved-version change is the shell's direct `@eslint/eslintrc` (3.3.5 → 3.3.7, deduped with ESLint's copy; dev-only, not imported by the ESLint config). Turbo was added.
- Coverage moved: `e2e/`, `playwright.config.ts` and `scripts/` stay at the root, so they are no longer linted (`eslint .` runs in `apps/shell`) or type-checked by `tsc`. Playwright still compiles the spec when it runs.
- Vercel cutover: done, see "Production cutover" below.

### Vercel preview (2026-10-29)

Temporary Vercel project built from `platform/phase-1` with root directory `apps/shell`: https://thetraversal-phase1.vercel.app. Compared against production (https://thetraversal.vercel.app, built from `main` at `1803dc4`).

- Status codes and response sizes match for `/`, `/tree`, `/tree?mode=lex`, three `/node/*` pages, `/robots.txt`, `/sitemap.xml`, `/opengraph-image`, a 404 page, and the `/resume/` redirect. Both resume files match the local copies byte for byte.
- HTML of all 114 sitemap URLs is identical once hashed asset names, Turbopack module ids and the build id are normalized. The one exception is the Phase 0 lint fix on `/`: the terminal input now has `role="combobox"` and `aria-controls`. That commit (`4c41b74`) is on this branch but not on `main`, so the difference is expected.
- `PARITY_BASE_URL=https://thetraversal-phase1.vercel.app pnpm exec playwright test`: 28 parity snapshots passed. `playwright.config.ts` now accepts `PARITY_BASE_URL` to run against a deployed site and skips the local web server when it is set.
- Pre-existing on both deploys, not caused by Phase 1: `/opengraph-image` returns 200 with an empty body (0 bytes), and `/favicon.ico` is 404 (`/favicon.svg` is served).
  - Fixed after Phase 1: the empty OG body was a satori error (a multi-child `<div>` without `display: flex`). `/opengraph-image` and the new per-node `/node/[slug]/opengraph-image` are now static, rendered at build by `apps/shell/src/lib/og/card.tsx` on the Node runtime. `public/` now has `favicon.ico` (16/32/48) and `apple-touch-icon.png`, both rasterized from `favicon.svg`.

### Production cutover (2026-10-29)

The production project (`thetraversal`) now has root directory `apps/shell` and is connected to GitHub, so pushes to `main` deploy it. Before this it was deployed with the Vercel CLI and had no Git integration. Deployed commit: `50125c6` (merge of `platform/phase-1`).

- https://thetraversal.vercel.app serves the same status codes and sizes as the preview for every route checked, including both resume files.
- HTML of all 114 sitemap URLs is identical to the preview after normalizing hashes, module ids and the build id.
- `PARITY_BASE_URL=https://thetraversal.vercel.app pnpm exec playwright test`: 28 parity snapshots passed.

All Phase 1 exit criteria are met. The temporary `thetraversal-phase1` project is still connected to the repo and can be deleted.

## Phase 2 (2026-10-29)

Branch: `platform/phase-2`. Content compiles from `content/` into the IR (`@tv/ir`); `apps/shell/src/data` is a facade over it, and `/node` pages render compiled HTML bodies. Same machine and Next.js 16.2.1. All commands run from the repo root.

### Build

- `pnpm build` (`@tv/ir#build` → `@tv/shell#build`): passes.
- Statically generated `/node/*` pages: **112** (same as Phase 1).
- IR: 112 entities, 125 edges (contains + `implements` + derived `uses`), 30 bodies (26 node prose, 4 essays). `graph.json` is **12.1 KB** gzipped (budget 60 KB). Draft projects are no longer shipped.

### First-load JS (gzipped)

| Route | KB gz | Chunks |
|---|---:|---:|
| `/` | 268.8 | 14 |
| `/tree` | 273.0 | 15 |
| `/node/reachble` | 246.5 | 12 |
| `/node/rewiring-the-interface` | 246.5 | 12 |
| `/node/timeline-0` | 246.5 | 12 |

`/` +3.6 KB and `/tree` +2.4 KB versus Phase 1: the graph JSON plus the IR client replace the hand-written registries. Zod is not in any client chunk. Node pages +0.2 KB.

### Lighthouse

Same setup as Phase 1. Three runs each; performance varied 91–93 on `/` and 93–97 on `/node/reachble` on the same build, so the first run is recorded.

| Page | Perf | A11y | Best practices | SEO | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` | 91 | 95 | 96 | 100 | 3.6 s | 10 ms | 0 |
| `/node/reachble` | 93 | 95 | 96 | 100 | 3.2 s | 10 ms | 0 |

Same failing audits as Phase 1: `color-contrast`, `largest-contentful-paint` (deferred), and the local-only `errors-in-console`.

### Parity

- Golden test (`apps/shell/src/__tests__/ir-parity.test.ts`): the IR projected to an AST equalled the legacy tree with `toStrictEqual`, inline bodies included, at `41286ae`. The legacy registries were then deleted and the test now checks projection invariants.
- `pnpm e2e`: 28 parity snapshots passed. No snapshot was re-recorded.
- Full-page screenshots of all 112 `/node/*` pages × 2 themes × 2 viewports against a production build of `main` (`bdafe56`): **448 byte-identical, 0 different**, including the essays with highlighted code. Run both before and after the legacy deletion.

### Other checks

- `pnpm lint`: 0 problems. `pnpm type-check`: passes. `pnpm test`: `@tv/ir` 2 files, 13 tests; `@tv/shell` 2 files, 38 tests; all pass.

### Notes

- Removed from the shell: `next-mdx-remote`, `gray-matter`, `remark-gfm`, `rehype-pretty-code`, `shiki` (the last three now belong to `@tv/ir`), `src/lib/mdx.ts`, `mdx-components.tsx`, `src/data/legacy/`.
- `apps/shell/vercel.json` builds through Turbo (`pnpm exec turbo run build --filter=@tv/shell` from the repo root) so the IR is compiled before `next build`. Not yet verified on a Vercel preview.

## Phase 3 (2026-10-29)

Branch: `platform/phase-3`. `packages/contract` and the shell's target host exist; the AST runs as a local target in `apps/shell/src/targets/ast`, mounted into a shadow root at `/t/ast` through `TargetContext` only. `/tree` is a 308 to `/t/ast`. Same machine and Next.js 16.2.1.

### Build

- `pnpm build`: passes. Statically generated `/node/*` pages: **112**. New route `/t/[target]` → `/t/ast` (SSG; the server outline is in the HTML). `/tree` redirects in `next.config.ts`, query kept.

### First-load JS (gzipped)

| Route | KB gz | Chunks |
|---|---:|---:|
| `/` | 268.7 | 16 |
| `/t/ast` | 265.8 | 15 |
| `/node/reachble` | 247.5 | 14 |
| `/node/rewiring-the-interface` | 247.5 | 14 |
| `/node/timeline-0` | 247.5 | 14 |

`/t/ast` replaces `/tree` (273.0): the AST is no longer in first-load JS. It loads on demand at mount: **47.3 KB gz** in 6 chunks (manifest budget 120). Node pages +1.0 KB (shell store and kind tables).

### Lighthouse

Same setup as Phase 2.

| Page | Perf | A11y | Best practices | SEO | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` | 92 | 95 | 96 | 100 | 3.4 s | 10 ms | 0 |
| `/node/reachble` | 93 | 95 | 96 | 100 | 3.2 s | 10 ms | 0 |
| `/t/ast` | 93 | 95 | 96 | 100 | 3.2 s | 10 ms | 0 |
| `/tree` on `main` (Phase 2, for comparison) | 99 | 96 | 96 | 100 | 2.1 s | 20 ms | 0 |

`/` and `/node/*` are within Phase 2's run-to-run range. `/t/ast` paints the tree later than `/tree` did (LCP 2.1 → 3.2 s): the target mounts after hydration and loads its chunk, with the outline shown until then. Prefetching the target (LLD-03 §11) is the planned fix. Its failing audits (`aria-allowed-role`, `label-content-name-mismatch`, `uses-passive-event-listeners`, `color-contrast`) fail on `main`'s `/tree` too.

### Parity

- `pnpm e2e`: 28 snapshots passed. The three AST routes now load `/t/ast?mode=…` and are compared with their Phase 0 `/tree` snapshots; none was re-recorded. The mobile AST snapshots were flaky at first because the token stream's Framer spring ran despite reduced motion; the AST now wraps Framer in `MotionConfig reducedMotion="user"`, and 36 repeated runs passed.
- Against a production build of `main` (`c58dac8`): all 112 `/node/*` pages × 2 themes × 2 viewports are **byte-identical (448/448)**, all 112 node OG images are byte-identical, and the sitemap differs only in `/tree` → `/t/ast`.
- Functional checks (Playwright, production build): a node click sets `?focus=` and records a visit; opening the context window narrows the canvas and closes the inspector; mode changes go through the URL; visits made on `/node/*` show in the tree and the ctx count; clearing the history clears both; an unknown `focus` is removed from the URL; `?traversal=` share links restore visits. No console errors besides the local-only analytics 404.
- `?remount=1` (dev): three unmount/mount cycles leave one React root and one adopted stylesheet, the tree stays interactive, and React logs no warnings.

### Other checks

- `pnpm lint`: 0 problems, with the new boundaries (a probe importing `next/link` or `@/platform/*` from `targets/ast` fails). `pnpm type-check`: passes. `pnpm test`: `@tv/contract` 19, `@tv/ir` 13, `@tv/shell` 47; all pass.

### Notes

- Contract additions made before any target shipped (CONTRACT_VERSION stays 1): `ctx.visited`, `ctx.inset`, bus events `traversal:reset` and `chrome:inset`, manifest `entry.kind: "local"`.
- Shell chrome is overlaid on the AST (LLD-03 §12): the AST keeps invisible stand-ins for `← root` and `ctx`, and its header height is `--tv-chrome-top` in `tokens.css`. The target switcher renders nothing until a second target is registered.
- The landing preview label still reads `// preview · /tree` so the landing snapshot is unchanged; the link under it goes to `/t/ast`.

## Phase 4 (2026-10-30)

Branch: `platform/phase-4`. The AST is its own workspace, `targets/ast` (`@tv/target-ast`), built with Vite and `@module-federation/vite` into `dist/_t/ast/`, and loaded by the shell at runtime from `/_t/ast/` (rewritten to `TARGET_AST_ORIGIN`, default `localhost:5101`). Measured locally against production builds of both; the Vercel projects do not exist yet.

### Build

- `pnpm build`: passes (`@tv/ir`, `@tv/target-ast`, `@tv/shell`). The shell no longer depends on d3.

### First-load JS (gzipped)

`scripts/measure-first-load.mjs` now skips `noModule` scripts: the 38.5 KB legacy polyfill bundle that only browsers without module support download. Earlier phases counted it, so both columns are given.

| Route | KB gz | Old method | Phase 3 (old method) |
|---|---:|---:|---:|
| `/` | 224.3 | 262.8 | 268.7 |
| `/t/ast` | 222.2 | 260.7 | 265.8 |
| `/node/*` | 203.0 | 241.6 | 247.5 |

The 150 KB exit criterion is not reachable by moving targets out. Of `/t/ast`'s 222 KB, React DOM is 69 KB and the Next runtime about 80 KB, so the framework alone is ~150 KB. Framer Motion added 41 KB to every page because `EasterEggOverlays` (in the layout) and `ContextWindow` imported it, and the shell's own code plus the inlined IR is about 30 KB.

Framer Motion is now out of first-load JS. The three shell components that use it render nothing until the visitor acts (context window opened, landing prompt run, Konami code or 30 s idle), so they load through `preloadable()` (`src/lib/preloadable.ts`): `React.lazy` plus a preload when the browser is idle, so first use does not wait.

| Route | Before | After lazy Framer |
|---|---:|---:|
| `/` | 224.3 | **175.0** |
| `/t/ast` | 222.2 | **180.0** |
| `/node/*` | 203.0 | **163.0** |

What is left is mostly the framework. The budget is now per route: total ≤ 185 KB, and ≤ 35 KB of shell app code over the framework baseline (the chunks Next loads for `/_not-found`, 150.7 KB). `pnpm measure:first-load --enforce` checks both and CI runs it.

| Route | Total | App over framework |
|---|---:|---:|
| `/` | 175.0 | 24.3 |
| `/t/ast` | 180.0 | 32.8 |
| `/node/*` | 163.0 | 15.8 |

### AST target

| | KB gz |
|---|---:|
| All JS (`dist/_t/ast`, 10 files) | 169.4 |
| Loaded at mount: `remoteEntry.js` + `mount` chunk + runtime pieces | ~129 |
| Loaded on desktop after mount: `ASTCanvas` + d3 | ~40 |

Phase 3 loaded 47.3 KB at mount because the AST shared the shell's React and Framer. Under ADR-8 it bundles its own (React DOM ~58 KB, Framer ~38 KB). Budget set to 180 KB; ADR-8 says to revisit sharing with an import map once a second React target exists. The compiled CSS (5.2 KB gz) ships inside the bundle and is adopted into the shadow root.

### Lighthouse

Lighthouse 12.8.2, same setup as Phase 2, against the shell on `:3100` and the AST target's build on `:5101`.

| Page | Perf | A11y | Best practices | SEO | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` | 89–92 | 95 | 93 | 100 | 3.4–3.8 s | 60 ms | 0 (one run 0.026) |
| `/node/reachble` | 91 | 95 | 93 | 100 | 3.5 s | 30 ms | 0 |
| `/t/ast` | 94 | 95 | 93 | 100 | 3.0 s | 60 ms | 0 |
| `/`, Framer lazy | 94 | 95 | 93 | 100 | 3.1 s | 40 ms | 0 |
| `/node/reachble`, Framer lazy | 94 | 95 | 93 | 100 | 3.1 s | 30 ms | 0 |
| `/t/ast`, Framer lazy | 96 | 95 | 93 | 100 | 2.7 s | 70 ms | 0 |

Best practices dropped from 96 to 93 on every page because of the report-only CSP: Lighthouse's `inspector-issues` audit counts the "Content security policy" issues Chrome raises for Next's inline scripts. It comes back once the policy covers those scripts (LLD-04 §6). `/t/ast` is within Phase 3's range despite the larger target.

### Conformance

`pnpm conformance`: 12 passed, 0 failed, 2 warnings, 1 manual. The warnings are React's `document` `selectionchange` listener and Framer Motion's `window` `resize` listener: each registers once per page and is not added again on remount. A deliberately planted per-mount `window` listener and a `document.body` write both fail the run.

### Parity and checks

- `pnpm e2e` (both servers started from scratch with `CI=1`): 28 snapshots passed, none re-recorded. The AST renders from its own Tailwind build inside the shadow root and matches the Phase 0 `/tree` snapshots.
- Failure drill, local: with the target server stopped, `/t/ast` keeps the server outline (111 links) and shows `error[T0004]: target 'ast': manifest.json returned 500` within 150 ms.
- `pnpm dev` path: the shell's rewrite to the target's `tv-dev` server (watch build + preview) mounts the AST; `dev:standalone` mounts, refocuses, re-themes and remounts it in the harness.
- CSP (report-only): no violations from loading or running the target. 7 (`/`), 34 (`/t/ast`) and 11 (`/node/reachble`) violations, all Next inline scripts.
- `pnpm lint`, `pnpm type-check`: pass. `pnpm test`: `@tv/contract` 31, `@tv/ir` 13, `@tv/target-kit` 2, `@tv/target-ast` 38, `@tv/shell` 10; all pass. The AST's 37 tests moved with it from the shell.

### Deployed (Vercel)

- `thetraversal-t-ast` (root `targets/ast`) serves `https://thetraversal-t-ast.vercel.app/_t/ast/`; the shell's `TARGET_AST_ORIGIN` points at it for Production and Preview. Production `/t/ast` mounts the AST in ~1.3 s with no console errors; `/tree?mode=eval` is a 308 to `/t/ast?mode=eval`.
- Two fixes found on the first deploys: `TARGET_*_ORIGIN` must be declared in `turbo.json`, or Turbo's strict env mode hides it from `next build` and the rewrite falls back to `localhost` (PR "pass TARGET_*_ORIGIN through Turbo"); and `content/` became the workspace package `@tv/content`, because content-only commits were invisible to `turbo-ignore` and would have skipped the shell deploy (PR #8).
- Separate deploys: PR #7 changed only `targets/ast/package.json` (1.0.0 → 1.0.1). Production built only `thetraversal-t-ast`; the shell's deploy for that commit was skipped by its ignore step, and `thetraversal.vercel.app/_t/ast/manifest.json` reported 1.0.1 through the existing shell deploy. The reverse holds too: a shell-only merge skipped the target. A branch's first push builds every preview once, because `turbo-ignore` has no earlier deployment on that branch to compare with.
- Failure drill on a preview: with `TARGET_AST_ORIGIN` set to a nonexistent deployment for the PR #8 branch only, `/t/ast` returned 200, the target failed in under a second with `error[T0004]: target 'ast': manifest.json returned 404`, and the outline kept all 111 links. The variable was removed and the preview redeployed afterwards.
- CI: all four jobs pass from PR #6 on, including e2e on macOS against the Phase 0 snapshots.

## Phase 5: `three` target

Measured on 2026-10-30, Apple M1, production builds served locally (shell `next start`, both targets `vite preview`).

### three target

- `@tv/target-three` 1.0.0: **169.2 KB gz** in 8 files (three.js is most of `mount`, 141.0; the federation runtime 18.5; `remoteEntry.js` 6.2). Budget 185 KB. No framework: vanilla TypeScript and `three` 0.187.
- Mount, after a hover prefetch: `mount()` starts ~40 ms after the switcher click, the scene is built ~30 ms later, the first frame lands at ~110 ms (first shader compile ~30 ms on the GPU). Model and layout for the 112-entity IR take under 15 ms.
- Renders on demand: no frames while idle.

### Warm switch

Timed in the page from the switcher click to `data-target-state="ready"`, after hovering both chips, 10 round trips, Chromium on the GPU (`--use-angle=metal`):

| Switch | p75 | Range |
|---|---:|---:|
| `ast` → `three` | 62 ms | 46–119 ms |
| `three` → `ast` | 36 ms | 17–38 ms |

Focus was preserved on all 20 switches. Exit criterion: p75 under 400 ms.

Default headless Chromium renders WebGL in software (SwiftShader). There the first paint of the canvas costs a ~335 ms main-thread task (compositor readback), and Playwright's own polling added more, which is why a first measurement read ~400 ms. Use the GPU for timings (LLD-04 §7).

### Shell first-load

| Route | Total | App over framework |
|---|---:|---:|
| `/t/ast`, `/t/three` (same route) | 180.7 KB gz | 33.4 KB (Phase 4 code: 32.8) |
| `/` | 175.0 KB gz | 24.3 KB |
| `/node/*` | 163.0 KB gz | 15.8 KB |

`AccessibleEntityList` loads only for targets with `a11y` `partial`/`decorative`, preloaded when idle. Prefetch and the switcher add 0.6 KB to `/t/*`.

### Lighthouse

Lighthouse 12.8.2, default mobile, headless Chrome, shell on `:3000` with both target builds.

| Page | Perf | A11y | Best practices | SEO | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` | 94 | 95 | 93 | 100 | 3.1 s | 14 ms | 0 |
| `/node/reachble` | 94 | 95 | 93 | 100 | 3.1 s | 12 ms | 0 |
| `/t/ast` | 92 | 95 | 93 | 100 | 3.4 s | 12 ms | 0 |
| `/t/three` | 96 | 100 | 93 | 100 | 2.7 s | 62–105 ms | 0 |

Best practices is 93 for the Phase 4 reasons (report-only CSP issues) plus the local-only 404 for `/_vercel/insights/script.js`, which Vercel serves in production. `/t/three` first scored 89: its 11 px scene labels failed the legible-font-size audit on a phone viewport; text in the target is now at least 12 px below 640 px. Accessibility 95 on the other pages is the existing `--text-faint` contrast finding.

### Conformance

- `three`: 14 passed, 0 failed, 2 manual (reduced motion by eye; pointer selection calls `ctx.nav.focus`, which `mount.ts` does on every pick). Remount passes, and after each unmount the root is empty, no rAF is pending, no listeners remain, and the WebGL context is lost.
- `ast`: unchanged (12 passed, 2 page-lifetime listener warnings).
- The runner now ignores Chromium's GPU driver notes (`GL Driver Message … GPU stall due to ReadPixels`), which it logs for a bare `gl.clear` canvas with no target code.

### Behavior checks (Playwright against the built app)

- `/t/three?focus=reachble`: list shows Reachble selected. ↑ → `projects`, ↓ → `reachble` (round trip), → → `mfkit`, Esc → `projects`. List click → `resumind`; ← inside the list → `projects` with keyboard focus kept on the tree. Clicking empty canvas steps out to `root`.
- Switch to `ast` with focus `reachble`: focus kept, zero canvases left on the page.
- Keyboard-only: every entity is a row in the list's tree; ↑↓←→ Home End reach all 112 and the scene follows.

### Parity and checks

- `pnpm build`, `lint`, `type-check`, `test`, `conformance` pass.
- Parity: the 12 `/t/ast` snapshots were re-recorded because the switcher now shows (`--target=ast` `--target=three`; the id alone on phones). The diff was the switcher alone. Landing and node snapshots are unchanged. 28 pass.

### Not done yet

- Vercel project `thetraversal-t-three` and `TARGET_THREE_ORIGIN` on the shell project (MIGRATION Phase 5, last step).
