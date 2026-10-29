# LLD-04: Monorepo, Build, Deploy, CI

## 1. Workspace layout (end state)

```
thetraversal/
  apps/
    shell/                    # Next.js 16, deploys to thetraversal.vercel.app
  targets/
    ast/                      # Vite + @module-federation/vite, React 19
    three/                    # Vite + @module-federation/vite, vanilla three.js
    metrics/
    art/
  packages/
    ir/                       # @tv/ir: schema, compiler, IRClient
    contract/                 # @tv/contract: types + createBus + satisfiesRange
    tokens/                   # @tv/tokens: themes.ts, tokens.css, prose.css
    target-kit/               # @tv/target-kit: dev harness + conformance tests
    tsconfig/                 # shared tsconfig bases
  content/                    # registries + MDX (LLD-01)
  architecture/               # HLD, LLDs, MIGRATION.md
  CLAUDE.md
  package.json                # private, scripts call turbo
  pnpm-workspace.yaml
  turbo.json
```

`docs/` stays gitignored for local editorial notes (`CONTENT-v2.md`, `PLAN.md`). Architecture docs live in `architecture/` so they are versioned and public.

## 2. Workspace config

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - targets/*
  - packages/*
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build":      { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "!.next/cache/**"] },
    "@tv/ir#build": { "inputs": ["src/**", "package.json", "../../content/**"], "outputs": ["dist/**", "../../apps/shell/public/ir/**"] },
    "dev":        { "dependsOn": ["^build"], "cache": false, "persistent": true },
    "lint":       {},
    "type-check": { "dependsOn": ["^build"] },
    "test":       { "dependsOn": ["^build"] },
    "conformance":{ "dependsOn": ["build"] }
  }
}
```

The blocks above are the end state. The repo only carries config for completed phases (CLAUDE.md §2), so in Phase 1:

- `pnpm-workspace.yaml` lists `apps/*` and `packages/*` only. It also sets `publicHoistPattern` for `@types/react` and `@types/react-dom`: Next's own `.d.ts` files resolve `react` from `node_modules/.pnpm` and need React types at the root, or the shell's event handlers type as implicit `any`.
- `turbo.json` has `build`, `dev`, `lint`, `type-check`, `test`, plus a root task `//#parity` that `pnpm e2e` runs (Playwright from the root `e2e/`, which builds and starts `@tv/shell`). `conformance` arrives with Phase 4.
- Phase 2 adds `@tv/ir#build`. The IR compiler writes `apps/shell/public/ir/v1`, outside its own package, so that path is listed in the IR task's outputs: Turbo restores it on a cache hit (verified), and the shell's own `build` no longer needs `public/ir/**`. `dev` depends on `^build` so the shell boots with an IR, and `@tv/ir#dev` watches `content/`.
- Because Vercel's root directory is `apps/shell`, `next build` alone would run without the IR. `apps/shell/vercel.json` sets `buildCommand` to `cd ../.. && pnpm exec turbo run build --filter=@tv/shell`.

Package naming: `@tv/*` for internal packages, `@tv/target-<id>` for targets, `@tv/shell` for the app. All `"private": true`.

Internal packages are consumed as source in dev via `exports` pointing at `src/*.ts` with a `development` condition, and at `dist/` for build. Keeps `pnpm dev` free of watch-build chains.

## 3. Target build

```ts
// targets/three/vite.config.ts
import { defineConfig } from "vite";
import { federation } from "@module-federation/vite";

export default defineConfig({
  base: "/_t/three/",                       // assets resolve under the shell rewrite
  build: { target: "es2022", outDir: "dist", modulePreload: false },
  plugins: [
    federation({
      name: "tv_three",
      filename: "remoteEntry.js",
      manifest: true,                       // emits mf-manifest.json
      exposes: { "./mount": "./src/mount.ts" },
      shared: {},                           // ADR-8: nothing shared in v1
    }),
  ],
  server: { port: 5102, cors: true },
});
```

`base` is the detail that breaks most first attempts: without it, chunk URLs resolve against the target's own origin instead of `/_t/three/` and bypass the rewrite.

A small postbuild script copies `manifest.json` (the target manifest from LLD-02, generated from `package.json` version + a `target.config.ts`) into `dist/`.

Dev ports: `ast 5101`, `three 5102`, `metrics 5103`, `art 5104`, `llm 5105`. Shell dev on `3000`.

## 4. Shell config

```ts
// apps/shell/next.config.ts
import type { NextConfig } from "next";

const ORIGINS: Record<string, string | undefined> = {
  ast:     process.env.TARGET_AST_ORIGIN     ?? "http://localhost:5101",
  three:   process.env.TARGET_THREE_ORIGIN   ?? "http://localhost:5102",
  metrics: process.env.TARGET_METRICS_ORIGIN ?? "http://localhost:5103",
  art:     process.env.TARGET_ART_ORIGIN     ?? "http://localhost:5104",
};

const nextConfig: NextConfig = {
  transpilePackages: ["@tv/ir", "@tv/contract", "@tv/tokens"],
  async rewrites() {
    return Object.entries(ORIGINS).map(([id, origin]) => ({
      source: `/_t/${id}/:path*`,
      destination: `${origin}/_t/${id}/:path*`,
    }));
  },
  async redirects() {
    return [{ source: "/tree", destination: "/t/ast", permanent: true }];  // query is preserved
  },
};

export default nextConfig;
```

Targets deploy their `dist/` under a `_t/<id>/` prefix (Vercel `outputDirectory` with a nested folder, or a build step that moves `dist` into `dist/_t/<id>`), so the path is identical through the rewrite and on the target's own domain. That makes direct debugging at `https://thetraversal-t-three.vercel.app/_t/three/manifest.json` possible.

## 5. Vercel projects

| Project | Root directory | Framework | Domain |
|---|---|---|---|
| `thetraversal` (existing) | `apps/shell` | Next.js | thetraversal.vercel.app |
| `thetraversal-t-ast` | `targets/ast` | Vite (static) | thetraversal-t-ast.vercel.app |
| `thetraversal-t-three` | `targets/three` | Vite (static) | … |
| … | | | |

Each project:
- Install command: `pnpm install --frozen-lockfile` (run from repo root; Vercel handles monorepo root detection).
- Ignored Build Step: `npx turbo-ignore` so a commit only rebuilds affected projects. A change in `packages/contract` correctly rebuilds everything.
- Headers (`vercel.json` in each target):
  - `/_t/<id>/assets/*`: `Cache-Control: public, max-age=31536000, immutable`
  - `/_t/<id>/(manifest|mf-manifest).json` and `remoteEntry.js`: `Cache-Control: public, max-age=60, stale-while-revalidate=600`

Shell env vars per environment: `TARGET_<ID>_ORIGIN`. Preview deployments of the shell point at production targets by default. To test a target preview end to end, set the env var on a shell preview branch.

Moving the existing project's root directory to `apps/shell` happens at the Phase 1 merge. Do it on a preview first: create a temporary Vercel project pointed at the branch with root `apps/shell`, confirm, then change the real project's setting and merge in the same window.

## 6. CSP

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';     # adoptedStyleSheets and Framer Motion inline styles
img-src 'self' data:;
connect-src 'self';
worker-src 'self' blob:;
frame-ancestors 'none';
```

Same-origin rewrites keep `script-src 'self'` sufficient for all targets. Vercel Analytics script is first-party under `/_vercel/insights`. Ship as `Content-Security-Policy-Report-Only` for a week before enforcing.

## 7. CI (GitHub Actions)

```
on: pull_request, push to main

jobs:
  check:
    - pnpm install --frozen-lockfile
    - pnpm turbo run lint type-check test --filter=...[origin/main]
  build:
    - pnpm turbo run build --filter=...[origin/main]
    - size check: each target dist vs manifest.budget.jsKbGz; shell first-load JS vs 150 KB
    - IR budget enforced inside @tv/ir build
  conformance:   (needs build)
    - for each changed target: @tv/target-kit runs mount → setFocus(every kind) → unmount → mount → unmount
      in Playwright Chromium against a static server; asserts LLD-02 §7 obligations
  e2e:           (needs build)
    - start shell with all targets on local ports
    - visit /, /tree?mode=eval (expect 308), /t/ast?focus=reachble, /node/reachble
    - switch ast → three → metrics → back; assert no console errors, focus preserved, one <canvas> max
    - force T0004 by pointing one origin at a dead port; assert diagnostic + stay on current target
    - visual parity snapshots from Phase 0 for /, /t/ast?mode=*, /node/reachble
```

Lighthouse CI on `/` and `/node/reachble` with the thresholds already in `CLAUDE.md`.

## 8. Lint boundaries

`eslint` `no-restricted-imports` per workspace:

| Workspace | Forbidden |
|---|---|
| `targets/*` | `next`, `next/*`, `@tv/shell`, any path into `apps/` |
| `packages/*` | `react`, `next`, anything under `apps/` or `targets/` (except `target-kit` may import `react` for its harness UI) |
| `apps/shell/src/platform/**` | Any `targets/*` package (shell knows targets only by id) |
| Phase 3 only: `apps/shell/src/targets/ast/**` | `next/*`, `@/data`, `@/hooks/useTraversalState` |

## 9. Local dev

```bash
pnpm dev                          # turbo: shell + all targets + ir watch
pnpm --filter @tv/target-three dev:standalone   # target alone in target-kit harness with fixture IR
pnpm --filter @tv/ir build        # recompile content
```

`dev:standalone` mounts the target into a page with a fake shell: theme picker, focus picker (every entity), reduced-motion toggle, and buttons for suspend, resume, unmount, remount. Most target work happens here.
