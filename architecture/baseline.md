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
