# CLAUDE.md: The Traversal

Read this first. Then read the architecture doc that matches your task (table in §3). Update §2 when a phase completes.

## 1. What this is

Rajat Kumar's portfolio at thetraversal.vercel.app. Portfolio content is compiled into a typed IR (an entity graph), and independently deployed frontends called **targets** each traverse that IR in a different domain: an AST (the original site), a 3D space, a live metrics dashboard, generative art, and later an LLM conversation. A Next.js **shell** loads the IR first, then loads targets on demand through Module Federation and switches between them without a page reload, keeping the focused entity.

The medium is the message: the site is a compiler. Content is the source, `packages/ir` is the front end, targets are codegen backends, the shell is the runtime.

## 2. Current phase

```
PHASE: 1 complete  (app lives in apps/shell as @tv/shell, pnpm workspace + Turborepo at root;
          production deploys from apps/shell, see architecture/baseline.md "Phase 1"). Next: Phase 2.
```

The repo moves toward the end-state layout one phase at a time. **Only the structure for completed phases exists.** Do not create folders for a later phase unless the task is that phase. Phase definitions and exit criteria: `architecture/MIGRATION.md`.

| Phase | Repo shape |
|---|---|
| 0 | Single app at root: `src/app`, `src/components`, `src/data`, `src/content` |
| 1 | App moved to `apps/shell/` unchanged; pnpm workspace + Turborepo at root |
| 2 | `packages/ir` + `content/` added; `apps/shell/src/data/index.ts` is a facade over the IR |
| 3 | `packages/contract`, `packages/tokens`; AST runs as a local target in `apps/shell/src/targets/ast/` |
| 4+ | `targets/<id>/` workspaces, deployed separately |

## 3. Docs map

| Task touches | Read |
|---|---|
| Anything structural, or you are unsure | `architecture/HLD.md` |
| Content, data shape, `content/`, `packages/ir`, `/node/[slug]` | `architecture/lld/01-content-ir.md` |
| A target, or the interface between shell and target | `architecture/lld/02-target-contract.md` |
| Routing, loading, switching, focus, shell state, chrome | `architecture/lld/03-shell-runtime.md` |
| Workspace config, Vite/Next config, Vercel, CI, lint boundaries | `architecture/lld/04-build-deploy.md` |
| Telemetry, `/api/t`, `metrics` target | `architecture/lld/05-telemetry.md` |
| Executing a migration phase | `architecture/MIGRATION.md` |

If code and docs disagree, stop and say so. Do not silently pick one. If a decision in an ADR needs to change, propose the change to the doc in the same PR.

## 4. Hard rules

Breaking any of these breaks the project.

**Tooling**
- Only `pnpm`. Never `npm` or `yarn`.
- Never use `any` or `@ts-ignore` without a comment explaining why.
- Never use relative `../../` imports inside a workspace. Use `@/` inside `apps/shell`, package names (`@tv/ir`) across workspaces.

**Files you do not touch**
- `content/mdx/**/*.mdx`: essay and node prose. Only edit when the task is explicitly a content change from Rajat.
- `apps/shell/public/resume/*`: download artifacts.
- `docs/*`: local, gitignored editorial notes. Read `docs/CONTENT-v2.md` only when the task is a content sync.
- `pnpm-lock.yaml` by hand.

**Styling**
- Never hardcode colors. Use theme variables (`--ink`, `--ink-2`, `--tv-text`, `--text-mute`, `--text-faint`, `--line`, `--accent`, `--syntax-*`) or their Tailwind aliases (`ctp-*` utilities map onto them in `globals.css`). Theme values live in `packages/tokens/src/themes.ts` (`@tv/tokens`; `@/lib/themes` re-exports it until Phase 3).
- No CSS modules, styled-components, or inline `style={{}}` except computed values from D3, Framer Motion, or canvas/WebGL.
- Known debt: `apps/shell/src/components/ast/ASTNode.tsx` has a hex `GLOW_COLORS` map that bypasses themes. Do not copy the pattern; it is removed in Phase 3.

**Components**
- No default exports, except Next.js pages/layouts/route files and a target's `./mount` module (contract requires it).
- No click handlers on `<div>`. Use `<button>` or `<a>`.
- Never auto-play audio or video. Never block navigation with modals.
- In the AST target, D3 is layout math only. React renders all SVG. In WebGL targets the renderer owns its canvas; that is the only exception.

**Platform boundaries (Phase 3+)**
- Targets render only inside the `ShadowRoot` they are given. No `document.body`, `document.head`, `history`, or `location` writes.
- Targets never import `next/*` or anything from `apps/`, and never fetch `/ir/*`. Data comes from `ctx.ir`, navigation goes through `ctx.nav`.
- The shell is the only writer of the URL and of focus.
- Shell platform code never imports a target package. It knows targets by id only.
- Changing `packages/contract` is an ABI change: bump `CONTRACT_VERSION` for breaking changes and update every target in the same PR.
- Changing the IR schema follows LLD-01 §9 versioning.

## 5. Commands

From the repo root (Turborepo). The shell's own scripts (`next dev --turbopack`, `next build`, `eslint .`, `tsc --noEmit`, `vitest run`) live in `apps/shell/package.json`.
```bash
pnpm dev                                   # shell (+ targets and IR watch from Phase 2/4)
pnpm build | lint | type-check | test      # all workspaces; build must pass with zero errors before any task is done
pnpm type-check                            # run after touching apps/shell/src/lib/ast-types.ts or apps/shell/src/data/*
pnpm e2e                                   # Playwright parity snapshots (e2e/ at root; builds and starts @tv/shell)
pnpm e2e:update                            # re-record snapshots (only when a visual change is intended)
pnpm measure:first-load                    # first-load JS per route, from apps/shell/.next (run after build)
pnpm --filter @tv/shell dev                # shell only
pnpm --filter @tv/ir build                 # recompile content into the IR
pnpm --filter @tv/target-<id> dev:standalone   # target in the harness (Phase 4+)
pnpm conformance                           # target contract tests (Phase 4+)
```

## 6. Stack

Shell: Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind v4, Zustand, Framer Motion, D3 (layout only), MDX via next-mdx-remote (until Phase 2 moves MDX compilation into the IR build), Shiki, Vercel Analytics.
Platform: pnpm workspaces, Turborepo, `@module-federation/runtime` in the shell, `@module-federation/vite` in targets, Zod for IR and manifest schemas, Vitest, Playwright.

## 7. Invariants to preserve through every phase

1. `/` is the terminal void: one cursor, one prompt. Nothing auto-unfolds.
2. Every entity is linkable and server-rendered at `/node/[slug]`.
3. Mobile list view of the AST (`ASTMobileTree`) is first-class.
4. The context window persists across navigations, and after Phase 3 across targets.
5. Token stream clicks navigate to nodes.
6. Existing URLs keep working: `/tree?mode=lex|parse|eval` redirects to `/t/ast?mode=…` from Phase 3.
7. No target failure can blank a page. The outline is the last fallback.

## 8. Quality bar

- Lighthouse on `/` and `/node/*`: ≥95 performance, 100 accessibility, 100 best practices, 100 SEO.
- Shell first-load JS < 150 KB gzipped (the current single-app budget was 200 KB; the shell shrinks as targets move out).
- Each target stays under its manifest `budget.jsKbGz`.
- `prefers-reduced-motion` respected everywhere. AST uses `role="tree"`/`treeitem`, keyboard Tab/Enter/Arrows, focus rings on `--accent`, WCAG AA contrast.
- Animations: Framer Motion spring stiffness 120, damping 20. Page and target transitions 200 ms.

## 9. Naming

| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase | `TargetHost.tsx` |
| Hooks | camelCase, `use` prefix | `useTraversalState.ts` |
| Utils | camelCase | `traversal.ts` |
| MDX | kebab-case | `code-as-consciousness.mdx` |
| Entity ids / slugs | kebab-case, permanent | `reachble` |
| Target ids | short lowercase, permanent (URL segment) | `three` |
| Internal packages | `@tv/<name>` | `@tv/contract` |
| MF remote names | `tv_<id>` | `tv_three` |
| Storage keys | `tv.shell.*`, `tv.t.<id>.*`, `tv.theme.cmd` | |
| Error codes | `T000x` (LLD-02 §8) | `T0004` |

## 10. Content workflow

Projects follow the publication policy: only entries with a publicly verifiable artifact are published; everything else stays fully written with its flag off. Nothing is deleted from a registry.

- Phase 0-1: registries are `apps/shell/src/data/*.ts` (`PROJECT_REGISTRY` with `publish` flags).
- Phase 2+: registries are `content/registry/*.ts` with `status: "published" | "draft"`, compiled by `pnpm --filter @tv/ir build`, which must pass its integrity checks.

## 11. Definition of done for any task

1. `pnpm build`, `pnpm lint`, `pnpm type-check`, `pnpm test` pass.
2. No new hard-rule violations.
3. If the task was part of a phase, the phase checklist in `architecture/MIGRATION.md` is ticked, and §2 above is updated when the phase's exit criteria are all met.
4. Docs changed in the same PR when behavior or structure changed.
