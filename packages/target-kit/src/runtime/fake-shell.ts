import {
  TargetError,
  createBus,
  type Navigator as TargetNavigator,
  type ScopedStorage,
  type ShellBus,
  type TargetContext,
  type TargetEnv,
  type TargetHandle,
  type TargetManifest,
  type TargetModule,
} from "@tv/contract";
import type { Graph, IRClient } from "@tv/ir";
import { createIRClient } from "@tv/ir/client";
import graphJson from "@tv/ir/dist/graph.json";
import indexJson from "@tv/ir/dist/index.json";
import { themeSnapshot } from "@tv/tokens";

// ── Fake shell ─────────────────────────────────────────────────────────
// Just enough of the shell (LLD-03 §5, §7) to mount a target outside of
// it: an IR client over the compiled graph, a bus, a navigator that loops
// focus back into the target, and storage. Used by the standalone
// harness and by the conformance runner.

// The compiler validated the graph; the JSON import widens enums to string.
const graph = graphJson as unknown as Graph;
const bodies: Record<string, string | undefined> = indexJson.bodies;

export function fixtureIR(): IRClient {
  return createIRClient(graph, { bodyUrl: (id) => `/__tv/ir/${bodies[id] ?? `body/${id}.json`}` });
}

export type NavCall =
  | { kind: "focus"; id: string }
  | { kind: "open"; id: string }
  | { kind: "switchTarget"; target: string; focus?: string }
  | { kind: "setParam"; key: string; value: string | null }
  | { kind: "external"; url: string };

export interface FakeShellOptions {
  manifest: TargetManifest;
  ir?: IRClient;
  focus?: string | null;
  params?: Record<string, string>;
  reducedMotion?: boolean;
  /** Every navigator call, for logs and assertions. */
  onNav?: (call: NavCall) => void;
}

function memoryStorage(): ScopedStorage {
  const data = new Map<string, string>();
  return {
    get: <T>(key: string) => {
      const raw = data.get(key);
      return raw === undefined ? undefined : (JSON.parse(raw) as T);
    },
    set: (key, value) => void data.set(key, JSON.stringify(value)),
    remove: (key) => void data.delete(key),
  };
}

function readEnv(reducedMotion: boolean | undefined): TargetEnv {
  const media = (q: string) => window.matchMedia(q).matches;
  return {
    reducedMotion: reducedMotion ?? media("(prefers-reduced-motion: reduce)"),
    colorScheme: media("(prefers-color-scheme: light)") ? "light" : "dark",
    viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 },
    pointer: media("(pointer: coarse)") ? "coarse" : "fine",
    saveData: false,
  };
}

export interface FakeMount {
  handle: TargetHandle;
  /** Times ctx.ready() was called. */
  readyCalls(): number;
  /** Resolves on the first ctx.ready(). */
  ready: Promise<void>;
  unmount(): Promise<void>;
}

export interface FakeShell {
  readonly ir: IRClient;
  readonly bus: ShellBus;
  /** Focus as the URL would hold it. */
  focus: string | null;
  params: Record<string, string>;
  /** Overrides the media query; read at each mount. */
  reducedMotion: boolean | undefined;
  mount(module: TargetModule, root: ShadowRoot): Promise<FakeMount>;
}

export function createFakeShell(opts: FakeShellOptions): FakeShell {
  const { manifest } = opts;
  const ir = opts.ir ?? fixtureIR();
  const bus = createBus();
  const storage = memoryStorage();
  let current: TargetHandle | null = null;

  const shell: FakeShell = {
    ir,
    bus,
    focus: opts.focus ?? null,
    params: { ...opts.params },
    reducedMotion: opts.reducedMotion,

    async mount(module, root) {
      const lifetime = new AbortController();
      const scope = bus.scope();
      let readyCount = 0;
      let markReady = () => {};
      const ready = new Promise<void>((resolve) => {
        markReady = resolve;
      });

      // Async, like the real shell's URL round trip: a target that calls
      // nav.focus from an event handler gets setFocus after it returns.
      const setFocus = (id: string | null) => {
        queueMicrotask(() => {
          shell.focus = id;
          current?.setFocus(id, { source: "target" });
          bus.emit({ type: "focus:changed", id, source: "target" });
        });
      };

      const nav: TargetNavigator = {
        focus(id) {
          opts.onNav?.({ kind: "focus", id });
          // The shell validates against the IR and echoes focus back (LLD-03 §7).
          if (ir.entity(id)) setFocus(id);
        },
        open(id) {
          opts.onNav?.({ kind: "open", id });
        },
        switchTarget(target, o) {
          opts.onNav?.({ kind: "switchTarget", target, focus: o?.focus });
        },
        setParam(key, value) {
          if (!manifest.urlParams.includes(key)) {
            throw new TargetError("T0008", manifest.id, `'${key}' is not in manifest.urlParams`);
          }
          opts.onNav?.({ kind: "setParam", key, value });
          const next = { ...shell.params };
          if (value === null) delete next[key];
          else next[key] = value;
          shell.params = next;
          queueMicrotask(() => current?.onParams?.(next));
        },
        external(url) {
          opts.onNav?.({ kind: "external", url });
        },
      };

      const params: Record<string, string> = {};
      for (const key of manifest.urlParams) if (key in shell.params) params[key] = shell.params[key];

      const ctx: TargetContext = Object.freeze({
        id: manifest.id,
        ir,
        focus: shell.focus,
        params: Object.freeze(params),
        visited: Object.freeze(shell.focus ? [shell.focus] : []),
        inset: Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 }),
        theme: themeSnapshot(),
        env: readEnv(shell.reducedMotion),
        signal: lifetime.signal,
        nav,
        bus: scope.bus,
        storage,
        telemetry: { mark: () => {}, event: () => {} },
        ready: () => {
          readyCount += 1;
          markReady();
        },
      });

      const handle = await module.mount(root, ctx);
      current = handle;
      return {
        handle,
        ready,
        readyCalls: () => readyCount,
        async unmount() {
          lifetime.abort();
          scope.dispose();
          await handle.unmount();
          if (current === handle) current = null;
        },
      };
    },
  };
  return shell;
}
