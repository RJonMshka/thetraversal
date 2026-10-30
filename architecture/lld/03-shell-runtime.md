# LLD-03: Shell Runtime

App: `apps/shell` (Next.js 16 App Router). This is the current app after Phase 1, gradually thinned.

## 1. Routes

| Route | Rendering | Purpose | Status |
|---|---|---|---|
| `/` | Client, as today | Cursor void, parse animation, mode links | Unchanged. Mode links point at `/t/ast?mode=…` after Phase 3. |
| `/t/[target]` | Server outline + client target host | Any target. `?focus=<id>` plus target-owned params. | New in Phase 3 |
| `/tree` | `308` to `/t/ast` preserving `mode` | Backward compatibility for existing links | Redirect in Phase 3 |
| `/node/[slug]` | SSG from IR | Canonical entity page | Data source switches to IR in Phase 2 |
| `/api/t` | Route handler | Telemetry ingest | Phase 6 |
| `/api/metrics/summary` | Route handler, cached 5 min | Aggregates for `metrics` target | Phase 6 |
| `/api/llm` | Route handler, streaming | Claude API for `llm` target | Phase 8 |
| `/_t/:id/*` | Rewrite | Same-origin proxy to target deployment | Phase 4 |

`generateStaticParams` for `/t/[target]` comes from the registry, so unknown targets are a real 404.

## 2. Module layout

```
apps/shell/src/
  app/
    t/[target]/page.tsx        # server: outline + <TargetHost/>
    node/[slug]/page.tsx       # server: entity page from IR
    api/…
  platform/
    registry.ts                # static list of target ids + origins
    loader/
      index.ts                 # TargetLoader interface + selection
      mf.ts                    # @module-federation/runtime strategy
      esm.ts                   # plain import() strategy (fallback)
      local.ts                 # in-bundle strategy (Phase 3 only)
    host/
      TargetHost.tsx           # React island that owns the mount lifecycle
      transition.ts            # switch algorithm
      context.ts               # builds TargetContext for a target
      errors.ts                # T000x codes, diagnostics UI copy
    bus.ts                     # createBus from @tv/contract + per-target tracking
    focus.ts                   # URL <-> focus sync, single writer
    prefetch.ts
    capabilities.ts            # webgl/webgl2/offscreen probes, memoized
    telemetry.ts               # Phase 6
  chrome/
    TargetSwitcher.tsx         # --target=… flag UI, visual sibling of TraversalModeSelector
    ContextWindow.tsx          # moved from components/chrome, now cross-target
    AccessibleEntityList.tsx   # for partial/decorative targets
    Outline.tsx                # server-rendered IR outline
  state/
    shell-store.ts             # zustand: visited, contextWindow, theme
```

As built in Phase 3 (one local target, no switching yet):

- `platform/ir.ts` holds the shell's `IRClient` singleton (server components, chrome, every context).
- `platform/host/lifecycle.ts` is the framework-free mount sequence (§6 timeouts, checks, `guard`), unit-tested without a browser. `transition.ts` (switching between two live targets), `prefetch.ts`, `telemetry.ts` and `AccessibleEntityList.tsx` arrive with the phases that need them.
- Phase 4: `loader/local.ts` and `src/targets/` are gone. `loader/mf.ts` is the only strategy, and the AST is `targets/ast` (`@tv/target-ast`), loaded from `/_t/ast/`.
- `chrome/TargetView.tsx` is the client frame of `/t/[target]`: it composes `TargetHost` with the shell chrome and restores shared traversals (`?traversal=a,b,c`).
- `TargetHost` unmounts a target after React's commit (a React target cannot unmount its own root mid-render) and starts the next mount only once the previous one has fully unmounted.
- `?remount=1` (development builds only) shows a button that unmounts and remounts the target in place.

Phase 5 (second target, `three`):

- `chrome/AccessibleEntityList.tsx`: every entity in `contains` order as a WAI-ARIA tree (flat rows with `aria-level`, roving tabindex). ↑↓ move, ← / Esc / Backspace parent, → first child, Home/End, Enter opens `/node/<id>`. Each move changes focus, so the target follows along. It reads focus from the URL and writes it through `TargetHost`'s `chromeFocusRef` (`source: "shell-chrome"`); if no target is mounted it replaces the URL directly, and a target that mounts later starts there.
- `TargetView` asks the loader for the manifest (cached, the same request `TargetHost` makes) so it knows `a11y` before the target's code arrives. For `partial`/`decorative` it lays out the list beside the stage: a 288 px right column on desktop, below a 55vh stage on phones. The list's code is preloaded when idle and rendered from the resolved module, not `lazy()` + Suspense, whose reveal React throttles by ~300 ms.
- With the list on desktop, the context window opens over the list rather than the target, so `ctx.inset` stays zero.
- `platform/prefetch.ts`: §11 as built, below.

## 3. Registry

```ts
// apps/shell/src/platform/registry.ts
export const TARGETS = [
  { id: "ast",     default: true },
  { id: "three" },
  { id: "metrics" },
  { id: "art" },
] as const satisfies readonly { id: string; default?: true }[];

export type TargetId = (typeof TARGETS)[number]["id"];
```

Origins are not in code. `next.config.ts` maps `/_t/<id>/:path*` to `process.env.TARGET_<ID>_ORIGIN`. In dev, origins default to `http://localhost:51xx`.

Adding a target needs one registry line and one env var (shell deploy). Updating a target needs only the target's deploy, because the shell reads `manifest.json` at runtime.

## 4. Loader

```ts
// platform/loader/index.ts
export interface TargetLoader {
  manifest(id: TargetId, signal: AbortSignal): Promise<TargetManifest>;
  load(m: TargetManifest, signal: AbortSignal): Promise<TargetModule>;
  prefetch(m: TargetManifest): void;
}
```

`mf.ts`:

```ts
import { init, registerRemotes, loadRemote } from "@module-federation/runtime";

init({ name: "tv_shell", remotes: [] });   // once, client only

export const mfLoader: TargetLoader = {
  async manifest(id, signal) {
    const res = await fetch(`/_t/${id}/manifest.json`, { signal });
    if (!res.ok) throw new TargetError("T0004", id);
    return parseManifest(await res.json());   // zod; validation failure is T0004
  },
  async load(m, signal) {
    registerRemotes([{ name: m.entry.remote, entry: `/_t/${m.id}/${m.entry.url}` }], { force: false });
    const mod = await withAbort(loadRemote<{ default: TargetModule }>(`${m.entry.remote}/${m.entry.expose.slice(2)}`), signal);
    if (!mod?.default?.mount) throw new TargetError("T0004", m.id);
    return mod.default;
  },
  prefetch(m) { /* inject <link rel="modulepreload"> for the remote entry */ },
};
```

Verify `registerRemotes` and `loadRemote` signatures against the installed `@module-federation/runtime` version before implementing; the API has moved between minors.

Checks run between `manifest` and `load`, in this order, each mapping to a code from LLD-02 §8: contract version, IR range (`satisfiesRange(ir.version.schema, m.ir)`), hardware capabilities.

Manifests are cached in memory for the page lifetime and requested with `cache: "no-cache"` so a redeployed target is picked up on next visit.

As built in Phase 4 against `@module-federation/runtime` 2.9.2:

- `createInstance({ name: "tv_shell", remotes: [] })` instead of the global `init`, created on first load. The runtime is imported dynamically, so it is not in any route's first-load JS.
- Remotes are registered once as `{ name, entry: "/_t/<id>/remoteEntry.js", type: "module" }` and loaded with `loadRemote("tv_<id>/mount")`. The runtime imports ESM entries with a plain `import()`; no `eval` or `new Function` is involved.
- The lifecycle's one retry (§6, LLD-02 §6) re-registers the remote with `force: true` and a `?r=<timestamp>` cache-buster.
- A failed manifest request is dropped from the cache so the next mount asks again. Any non-200 or invalid manifest is `T0004`.
- `prefetch()` adds a `modulepreload` link for the remote entry; nothing calls it until the prefetch policy (§11) lands.

## 5. Context construction

`platform/host/context.ts` builds one `TargetContext` per mount:

- `ir`: the singleton `IRClient` created from the inlined graph.
- `params`: current search params filtered to `manifest.urlParams`.
- `nav.setParam`: validates key against the allowlist, then `router.replace` with merged params.
- `bus`: a per-target view over the shell bus that records unsubscribe functions; disposed on unmount.
- `storage`: `sessionStorage` wrapper with `tv.t.<id>.` prefix and try/catch on every call.
- `signal`: from an `AbortController` aborted at the start of unmount.
- `llm`, `data.metrics`: attached only if the capability is declared.

## 6. Switch algorithm

```ts
async function switchTo(next: TargetId, focus: string | null) {
  const token = ++switchToken;                 // last request wins
  const t0 = performance.now();
  const showSpinner = setTimeout(() => setPending(next), 150);

  try {
    const m = await loader.manifest(next, abort.signal);
    runChecks(m);
    const mod = await loader.load(m, abort.signal);
    if (token !== switchToken) return;          // superseded

    const stage = createHiddenStage();          // <div data-target=next hidden> + attachShadow
    const ctx = buildContext(m, stage.shadow, focus);
    const ready = waitForReady(ctx, 4000);
    const handle = await withTimeout(mod.mount(stage.shadow, ctx), 4000, "T0005");
    await ready;
    if (token !== switchToken) { await safeUnmount(handle, stage); return; }

    await swap(current, { m, handle, stage });  // View Transition or crossfade
    telemetry.switch({ from: current?.id, to: next, ms: performance.now() - t0 });
  } catch (e) {
    showDiagnostic(e);                          // stay on current target
    telemetry.error(e);
    if (!current) mountFallback();              // ast, then outline
  } finally {
    clearTimeout(showSpinner); setPending(null);
  }
}
```

`swap`:
1. If `document.startViewTransition` exists and `!reducedMotion`: wrap the visibility flip in it. Give stages `view-transition-name: tv-stage`.
2. Else crossfade with CSS opacity over 200 ms (matches current page transition timing).
3. Reduced motion: instant flip.
4. After the flip, `unmount` the previous target, or `suspend` it if it is the only warm slot candidate (see below).

Warm slot: keep at most one previous target suspended, for instant back-navigation. Never keep a WebGL target warm when the incoming target also declares WebGL (one GPU context at a time). Evict on `memory pressure` signals when available and after 60 s hidden.

## 7. Focus sync

Single writer: `platform/focus.ts`.

| Trigger | Action |
|---|---|
| URL changes (`focus` param, back/forward) | Parse, validate against IR (unknown id becomes `null` and URL is cleaned), call `handle.setFocus(id, {source: "url"})`, emit `focus:changed`, record visit. |
| Target calls `ctx.nav.focus(id)` | `router.replace` with new `focus`. The URL change then flows through the row above with `source: "target"`. The originating target receives its own focus back and must treat it idempotently. |
| Context window or accessible list click | Same as above with `source: "shell-chrome"`. |

Replace, not push, for focus changes inside a target, so the back button moves between targets and pages rather than every hovered node. Target switches use push.

## 8. State split (from today's `useTraversalState`)

| Today | After Phase 3 |
|---|---|
| `visitedNodes`, `contextWindow` | `shell-store.ts` (`tv.shell.traversal`), updated on every focus or node-page visit from any target |
| `currentMode` | AST target param `mode` + `ctx.storage` fallback |
| `expandedNodes` | AST target `ctx.storage` |
| `hasHydrated` pattern | Kept in shell store; targets mount only after hydration, so they never see pre-hydration state |

Shell-store entries are `{ id, label, kind, visitedAt }` under `tv.shell.traversal`. The shell sends each new visit to the mounted target as `entity:visited`, and a cleared history as `traversal:reset` (it also clears the target's `tv.t.<id>.*` storage). The AST keeps its state in one store per mount (`targets/ast/store.ts`), never a module singleton.

## 9. Server outline

`/t/[target]/page.tsx` renders `<Outline/>` inside the host container:

```tsx
<section data-outline aria-label="Portfolio outline">
  <h1>{root.label}</h1>
  {/* nested <ul> of contains tree, each item linking to /node/<id>, summary in <p> */}
</section>
```

The host removes the outline after the target signals ready. Effects: crawlers and no-JS clients get full structure and links on every target URL; first paint is meaningful text instead of an empty canvas; the outline doubles as the fallback of last resort.

## 10. Errors and isolation

- `TargetHost` is wrapped in a React error boundary, but target code runs outside React's tree, so every call into a handle (`mount`, `setFocus`, `onTheme`, `unmount`) goes through `guard(id, phase, fn)` which catches, maps to a code, and decides fallback.
- A `window` `error` and `unhandledrejection` listener attributes errors whose stack contains `/_t/<id>/` to that target (`T0007`). Three attributed errors within 30 s fault the target: unmount, show diagnostic, offer switch back.
- A faulted target is not retried automatically in the same page session.

## 11. Prefetch policy

1. After hydration and `requestIdleCallback`: fetch all manifests (small JSON).
2. On switcher hover/focus, or after 2 s on a node with a `focus` param: `prefetch()` the remote entry for that target.
3. Skip steps 1-2 when `navigator.connection.saveData` or `effectiveType` is `2g`/`slow-2g`.
4. Never prefetch a target whose hardware capability probe failed.

As built in Phase 5 (`platform/prefetch.ts`): steps 1, 3 and 4, and step 2 for the switcher (pointer enter or keyboard focus on a chip). Step 2 goes further than a `modulepreload` of the remote entry: it also calls `loader.load()`, which downloads and evaluates the exposed module without mounting it, so the switch only has to mount. The "2 s on a node" trigger is not built. Warm switch p75 locally: 62 ms to `three`, 36 ms to `ast` (baseline.md "Phase 5").

## 12. Chrome placement

| Component | Today | After |
|---|---|---|
| `TokenStream` | `/tree` page | AST target only (it is a lexer view of the career) |
| `ContextWindow` | `/tree` page | Shell, cross-target, visible on every `/t/*` route |
| `TraversalModeSelector` | Tree page | AST target |
| `TargetSwitcher` | (new) | Shell, same visual language as the mode selector: `--target=ast` (the id alone below 640 px) |
| `AccessibleEntityList` | (new, Phase 5) | Shell, beside targets with `a11y` `partial` or `decorative` |
| `FocusManager`, `EasterEggOverlays`, `ThemeInitializer` | Layout | Shell, unchanged |

Phase 3 layout convention. The AST draws the whole screen, header included, so its pages match the old `/tree` pixel for pixel. The shell overlays its chrome on top: the `← root` link and the `ctx` toggle sit in the AST's top row, where the AST leaves invisible stand-ins of the same size, and the context window opens below the AST's header, whose height is the `--tv-chrome-top` token in `@tv/tokens/tokens.css`. The shell reports the area its open panel covers as `ctx.inset` / `chrome:inset`, and closes the panel when a target moves focus. The switcher renders nothing while only one target is registered.
| `NodeInspector`, `NodeContentPopover` | Tree page | AST target |
