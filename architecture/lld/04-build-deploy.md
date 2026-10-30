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
- Phase 4 adds `targets/*` to the workspace and the `conformance` task (no cache: it drives a browser). `pnpm e2e` starts the AST target's build on 5101 next to the shell.

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

As built in Phase 4, every target uses `tvTarget()` from `@tv/target-kit/vite` instead of repeating this config:

```ts
// targets/ast/vite.config.ts
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [react(), tailwindcss(), ...tvTarget({ target, version: pkg.version, mount: "./src/mount.tsx" })],
});
```

- `tvTarget()` sets `base: "/_t/<id>/"`, `outDir: "dist/_t/<id>"`, the dev port, and federation (`name: tv_<id>`, `remoteEntry.js`, `exposes: { "./mount" }`, `shared: {}`, `dts: false`).
- It emits `manifest.json` during the build (no postbuild step) from `target.config.ts` (`defineTarget`) plus the package version. `entry.url` is `remoteEntry.js`: the shell loads the ESM entry directly, which skips a request and the runtime paths that evaluate strings. `mf-manifest.json` is still emitted for debugging.
- A remote has no `index.html`, so the build starts from an empty virtual module (`tv-noop.js`, unused); federation emits the entry and exposed chunks next to it.
- Vite runs with `--configLoader runner`: the default loader hands workspace packages to Node, which cannot resolve their extensionless TypeScript imports.
- Each target compiles its own Tailwind (`src/styles.css` imports `tailwindcss` and `@tv/tokens/tailwind.css`, the theme the shell also uses) and adopts the CSS into its shadow root from a string, so nothing is added to the document. Two shadow-DOM details: fonts are `@theme inline` over `--mono`/`--serif` so the host follows `applyTheme()`, and Tailwind's `@property` fallback is applied unconditionally because `@property` does not register from a shadow root.

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

As built in Phase 4, `next.config.ts` builds the rewrites from the registry (`TARGETS`), so a registered target needs only its env var. It also sends the report-only CSP header (§6).

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
- Ignored Build Step: `npx turbo-ignore` so a commit only rebuilds affected projects. A change in `packages/contract` correctly rebuilds everything. As built, each project's `vercel.json` sets `ignoreCommand` to `pnpm dlx turbo-ignore@2.11.10 <package>` (pnpm only, CLAUDE.md §4); the shell has it too, so a commit that touches only a target skips the shell deploy.
- Headers (`vercel.json` in each target):
  - `/_t/<id>/assets/*`: `Cache-Control: public, max-age=31536000, immutable`
  - `/_t/<id>/(manifest|mf-manifest).json` and `remoteEntry.js`: `Cache-Control: public, max-age=60, stale-while-revalidate=600`

Shell env vars per environment: `TARGET_<ID>_ORIGIN`. They must be declared in `turbo.json` (`build.env: ["TARGET_*_ORIGIN"]`): Turbo 2 runs tasks in strict env mode, so an undeclared variable never reaches `next build` and the rewrite silently falls back to `localhost`, which Vercel refuses to proxy (`DNS_HOSTNAME_RESOLVED_PRIVATE`). Declaring it also puts it in the build's cache key. Preview deployments of the shell point at production targets by default. To test a target preview end to end, set the env var on a shell preview branch.

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

Phase 4 finding (production build, report-only): loading and running the AST target causes no violations. Every violation is one of Next's own inline bootstrap scripts (7 on `/`, 34 on `/t/ast`, 11 on `/node/reachble`). Enforcing needs nonces for those (middleware + dynamic rendering) or hashes, before the policy can drop `-Report-Only`.

## 7. CI (GitHub Actions)

```
on: pull_request, push to main

jobs:
  check:
    - pnpm install --frozen-lockfile
    - pnpm turbo run lint type-check test --filter=...[origin/main]
  build:
    - pnpm turbo run build --filter=...[origin/main]
    - size check: each target dist vs manifest.budget.jsKbGz; shell first-load JS ≤ 185 KB, app ≤ 35 KB (CLAUDE.md §8)
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

As built in Phase 4 (`.github/workflows/ci.yml`): `check`, `build`, `conformance` and `e2e` jobs, filtered by `...[base]` where the doc says `[origin/main]` (the base is the PR base, or the previous commit on a push). `conformance` runs `turbo run conformance`, which builds each affected target first. The size check enforces target budgets inside conformance, and the shell's per-route budget in the `build` job (`measure:first-load --enforce`, framework baseline taken from `/_not-found`). `e2e` runs on macOS because the parity snapshots were recorded there. Lighthouse CI is not set up yet.

The conformance runner (`tv-conformance`, run in a target's directory after its build) serves `dist/` with a test page, loads the target through the MF runtime like the shell, and reports: budget, manifest checks, `ready()` once, `setFocus(null)` and every entity, suspend/resume, cleanup after each unmount (root empty, no rAF, no `window`/`document` listeners, workers, WebGL contexts), no writes outside the root, no `/ir/*` fetches, no errors or console warnings. Listeners a framework registers once per page (React's `document` `selectionchange`, Framer Motion's `window` `resize`) are reported as warnings; a listener that is added again on every mount fails. Reduced motion is checked by eye.

## 8. Lint boundaries

`eslint` `no-restricted-imports` per workspace:

| Workspace | Forbidden |
|---|---|
| `targets/*` | `next`, `next/*`, `@tv/shell`, any path into `apps/` |
| `packages/*` | `react`, `next`, anything under `apps/` or `targets/` (except `target-kit` may import `react` for its harness UI) |
| `apps/shell/src/platform/**` | Any `targets/*` package (shell knows targets only by id) |

Phase 3 had two more rows for the in-shell AST (`apps/shell/src/targets/ast/**`, and `platform/**` except `loader/local.ts`); both went away with the move. As of Phase 4, `targets/ast` and `packages/target-kit` have their own ESLint configs (typescript-eslint); the other packages do not lint yet. The harness is plain DOM, so `target-kit` does not need the React exception.

## 9. Local dev

```bash
pnpm dev                          # turbo: shell + all targets + ir watch
pnpm --filter @tv/target-three dev:standalone   # target alone in target-kit harness with fixture IR
pnpm --filter @tv/ir build        # recompile content
```

`dev:standalone` mounts the target into a page with a fake shell: theme picker, focus picker (every entity), reduced-motion toggle, and buttons for suspend, resume, unmount, remount. Most target work happens here.

As built in Phase 4: `dev:standalone` is Vite's dev server with hot reload, the target imported from source (no federation), at `http://localhost:<port>/_t/<id>/`. A target's `dev` (what `pnpm dev` runs) is `tv-dev`: a watch build plus a static server on the target's port, so the shell at `localhost:3000/t/<id>` loads a real federated build, rebuilt in under a second per change. Vite's own dev server cannot serve a React remote into the shell: its refresh preamble lives in the host page, and the host is Next.
