# LLD-02: Target Contract

Package: `packages/contract` (`@tv/contract`). Types plus a few hundred bytes of runtime (`createBus`, `satisfiesRange`). No dependency on React, Next, or any target framework.

This is the most important interface in the system. Treat changes to it like an ABI change.

## 1. Contract version

```ts
export const CONTRACT_VERSION = 1;
```

Major only. A target declares the contract version it was built against; the shell refuses to mount a mismatch and shows `error[T0001]`.

## 2. Manifest

Each target ships `manifest.json` next to its federation entry. The shell reads it before loading any code.

```ts
export interface TargetManifest {
  id: string;                     // "three". Permanent: it is a URL segment.
  label: string;                  // "Three"
  flag: string;                   // "--target=three", shown in the switcher
  description: string;            // one line for the switcher and the outline page
  version: string;                // target's own semver
  contract: 1;
  ir: string;                     // semver range of IR schema, e.g. ">=1.0.0 <2.0.0"
  entry: {
    kind: "mf" | "esm" | "local";   // "local": bundled into the shell (Phase 3 only)
    remote: string;               // MF remote name, e.g. "tv_three"
    expose: string;               // "./mount"
    url: string;                  // relative to /_t/<id>/, e.g. "mf-manifest.json"
  };
  capabilities: Capability[];
  budget: { jsKbGz: number };     // CI fails the target build above this
  urlParams: string[];            // target-owned query keys, e.g. ["mode"] for ast
  a11y: "full" | "partial" | "decorative";
  motion: "safe" | "reduced-variant" | "static-fallback";
  isolation: "shadow";            // only value in v1, reserved for future
}

export type Capability =
  | "webgl" | "webgl2"
  | "offscreen-canvas"
  | "audio"
  | "llm"              // shell exposes ctx.llm
  | "metrics-read";    // shell exposes ctx.data.metrics
```

Capability rules:
- Hardware capabilities (`webgl*`, `offscreen-canvas`, `audio`) are probed by the shell before loading code. Failure means `error[T0003]` and no download.
- Service capabilities (`llm`, `metrics-read`) are grants. The shell only attaches `ctx.llm` or `ctx.data.metrics` when declared. A target cannot reach a shell service it did not declare.

## 3. Module shape

```ts
export interface TargetModule {
  mount(root: ShadowRoot, ctx: TargetContext): Promise<TargetHandle> | TargetHandle;
}

export interface TargetHandle {
  /** Shell changed focus (URL nav, context window click, another target's request). */
  setFocus(id: string | null, meta: { source: FocusSource }): void;
  /** Theme or font changed. Tokens already updated via CSS vars; this is for canvas/WebGL targets that cache colors. */
  onTheme?(theme: ThemeSnapshot): void;
  /** Target-owned URL params changed through back/forward. */
  onParams?(params: Readonly<Record<string, string>>): void;
  /** Tab hidden or target kept warm offscreen. Stop rAF loops, pause audio. */
  suspend?(): void;
  resume?(): void;
  /** Must release everything: listeners, rAF, workers, WebGL contexts, object URLs. */
  unmount(): Promise<void> | void;
}

export type FocusSource = "url" | "shell-chrome" | "target" | "llm";
```

The exposed module is `./mount` and its default export is a `TargetModule`. This is the one place a default export is required.

## 4. Context

```ts
export interface TargetContext {
  readonly id: string;
  readonly ir: IRClient;                         // from @tv/ir
  readonly focus: string | null;                 // initial focus
  readonly visited: readonly string[];           // entities visited this session, oldest first
  readonly inset: ChromeInset;                   // area of the root covered by shell chrome
  readonly params: Readonly<Record<string, string>>; // only keys in manifest.urlParams
  readonly theme: ThemeSnapshot;
  readonly env: TargetEnv;
  readonly signal: AbortSignal;                  // aborted when unmount begins

  readonly nav: Navigator;
  readonly bus: Bus;
  readonly storage: ScopedStorage;               // sessionStorage under tv.t.<id>.*
  readonly telemetry: TargetTelemetry;

  /** Call once the first meaningful frame is painted. Shell waits for this before transitioning. */
  ready(): void;

  readonly llm?: LLMClient;                      // only with capability "llm"
  readonly data?: { metrics?: MetricsClient };   // only with capability "metrics-read"
}
// `llm` and `data` are added to the package with Phases 8 and 6. Adding an
// optional context field is not a breaking change.

export interface Navigator {
  focus(id: string): void;                       // request focus change; shell updates URL with replace
  open(id: string): void;                        // go to /node/<id>
  switchTarget(target: string, opts?: { focus?: string }): void;
  setParam(key: string, value: string | null): void; // only allowlisted keys, otherwise throws in dev
  external(url: string): void;                   // opens in new tab with noopener
}

export interface TargetEnv {
  reducedMotion: boolean;
  colorScheme: "dark" | "light";
  viewport: { width: number; height: number; dpr: number };
  pointer: "fine" | "coarse";
  saveData: boolean;
}

export interface ThemeSnapshot {
  name: string;                                  // "mint", "paper", ...
  font: string;
  /** Resolved values for canvas/WebGL targets that cannot read CSS vars per frame. */
  colors: { bg: string; card: string; text: string; mute: string; accent: string; line: string };
}

/** CSS px of the target's root covered by shell chrome (e.g. the context window). */
export interface ChromeInset { top: number; right: number; bottom: number; left: number }

export interface ScopedStorage {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

export interface TargetTelemetry {
  mark(name: string): void;                      // namespaced as t.<id>.<name>
  event(name: string, props?: Record<string, string | number | boolean>): void;
}
```

Why `ShadowRoot` and not `HTMLElement`: isolation is part of the contract, not a convention. Targets attach their own styles with `root.adoptedStyleSheets` or a `<style>` inside the root. Theme tokens are CSS custom properties on `:root`, which inherit into shadow trees, so `var(--accent)` works unchanged.

## 5. Bus

```ts
export type ShellEvent =
  | { type: "focus:changed"; id: string | null; source: FocusSource }
  | { type: "entity:visited"; id: string }
  | { type: "theme:changed"; theme: ThemeSnapshot }
  | { type: "target:changed"; from: string | null; to: string }
  | { type: "visibility"; hidden: boolean }
  | { type: "traversal:reset" }                       // visitor cleared their history
  | { type: "chrome:inset"; inset: ChromeInset };     // shell chrome opened or closed

export interface Bus {
  on<T extends ShellEvent["type"]>(type: T, fn: (e: Extract<ShellEvent, { type: T }>) => void): () => void;
}
```

The bus is read-only for targets. Every write goes through `nav` or `telemetry`, so the shell sees and validates every request. Subscriptions are tracked per target and force-cleared on unmount, so a leaky target cannot keep receiving events.

`visited` plus `entity:visited` and `traversal:reset` let a target mark what the visitor has seen, including visits made on `/node` pages while it was not mounted. `inset` plus `chrome:inset` tell a target which part of its root is covered by shell chrome (the context window), so it can keep its own content clear of it.

`setFocus` on the handle and `focus:changed` on the bus carry the same information. The handle method exists so simple targets do not need the bus at all.

## 6. Lifecycle

```
idle ─▶ resolving ─▶ loading ─▶ mounting ─▶ ready ─▶ active ⇄ suspended
                                   │                     │
                                   ▼                     ▼
                                 error              unmounting ─▶ disposed
```

| Transition | Who | Timeout | On failure |
|---|---|---|---|
| resolving (manifest + checks) | shell | 3 s | `T0002`/`T0003`, no code download |
| loading (remote entry + chunks) | shell | 8 s | `T0004`, one retry with cache-bust |
| mounting (`mount()` resolves) | target | 4 s | `T0005`, shell calls `unmount` defensively, clears root |
| ready (`ctx.ready()` called) | target | 4 s after mount | shell transitions anyway and logs `t.<id>.late_ready` |
| unmounting | target | 2 s | shell clears root, aborts `signal`, logs `T0006` |

## 7. Target obligations (conformance checklist)

A target is conformant when all of these hold. `packages/target-kit` runs them as tests.

1. Renders only inside `root`. No writes to `document.body`, `document.head`, `window.location`, or `history`.
2. Never imports `next/*`, `@tv/shell`, or fetches `/ir/*` directly.
3. Calls `ctx.ready()` exactly once.
4. Handles `setFocus(null)` (no focus) and `setFocus` for any entity id in the graph, including kinds it does not visually emphasize.
5. On `unmount`: root is empty, no rAF scheduled, no listeners on `window`/`document`, WebGL contexts lost (`renderer.dispose(); renderer.forceContextLoss()`), workers terminated.
6. Honors `env.reducedMotion` per its declared `motion` mode.
7. If `a11y` is `partial` or `decorative`, calls `ctx.nav.focus` when its own pointer interaction selects an entity, so the shell's accessible list stays in sync.
8. Bundle under `budget.jsKbGz`.
9. Works when mounted, unmounted, and mounted again in the same page (no module-level singletons that assume one mount).

## 8. Error codes

| Code | Meaning |
|---|---|
| T0001 | Contract version mismatch |
| T0002 | IR schema outside declared range |
| T0003 | Missing hardware capability |
| T0004 | Remote failed to load or timed out |
| T0005 | `mount` threw or timed out |
| T0006 | `unmount` threw or timed out |
| T0007 | Runtime error attributed to target (window error with target chunk URL) |
| T0008 | Disallowed `setParam` key (dev throws, prod logs) |

Shown to users as a compiler diagnostic in the site's voice, with the code and a one-line cause. Logged to telemetry with code and target version.

## 9. Example: minimal target

```ts
// targets/three/src/mount.ts
import type { TargetModule } from "@tv/contract";
import { createScene } from "./scene";

const target: TargetModule = {
  mount(root, ctx) {
    const host = document.createElement("div");
    host.className = "stage";
    root.append(host);

    const scene = createScene(host, ctx.ir, {
      theme: ctx.theme,
      reducedMotion: ctx.env.reducedMotion,
      onPick: (id) => ctx.nav.focus(id),
    });
    scene.flyTo(ctx.focus, { instant: true });
    scene.onFirstFrame(() => ctx.ready());

    return {
      setFocus: (id) => scene.flyTo(id, { instant: ctx.env.reducedMotion }),
      onTheme: (t) => scene.setPalette(t.colors),
      suspend: () => scene.pause(),
      resume: () => scene.play(),
      unmount: () => { scene.dispose(); root.replaceChildren(); },
    };
  },
};

export default target;
```
