import {
  TargetError,
  createBus,
  type MetricsClient,
  type MetricsSummary,
  type MetricsWindow,
  type Navigator as TargetNavigator,
  type ScopedStorage,
  type ShellBus,
  type TargetContext,
  type TargetEnv,
  type TargetHandle,
  type TargetManifest,
  type TargetModule,
  type TelemetryEvent,
  type TelemetryProps,
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

// ── Metrics (LLD-05 §5) ────────────────────────────────────────────────
// For targets that declare "metrics-read": a session that looks like a
// visitor came from the AST, plus this target's own load once it calls
// ready(), the way the shell reports it.

/** Plausible aggregates for the harness: three targets, a few days of loads. */
export function fakeSummary(window: MetricsWindow, now = Date.now()): MetricsSummary {
  const day = 24 * 3600_000;
  const hours = window === "24h";
  const step = hours ? 3600_000 : day;
  const n = hours ? 24 : window === "7d" ? 7 : 30;
  const start = Math.floor(now / step) * step - (n - 1) * step;
  const base: Record<string, number> = { ast: 210, three: 420, metrics: 160 };
  const series = Object.entries(base).flatMap(([target, ms]) =>
    Array.from({ length: n }, (_, i) => ({
      bucket: new Date(start + i * step).toISOString(),
      target,
      p75LoadMs: Math.round(ms * (1 + 0.25 * Math.sin(i / 2 + ms))),
    }))
  );
  const target = (id: string, loads: number, ms: number, errors: Array<{ code: string; count: number }>) => ({
    id,
    loads,
    loadMs: { p50: Math.round(ms * 0.8), p75: ms, p95: Math.round(ms * 1.9) },
    loadBreakdownP75: { manifest: 18, entry: Math.round(ms * 0.6), mount: Math.round(ms * 0.2), ready: Math.round(ms * 0.1) },
    errorRate: errors.reduce((a, e) => a + e.count, 0) / loads,
    topErrors: errors,
  });
  return {
    window,
    generatedAt: now,
    sessions: hours ? 41 : n * 37,
    targets: [
      target("ast", 820, 210, []),
      target("metrics", 64, 160, []),
      target("three", 310, 420, [{ code: "T0003", count: 4 }]),
    ],
    switches: [
      { from: "ast", to: "metrics", count: 51, p75: 140 },
      { from: "ast", to: "three", count: 198, p75: 380 },
      { from: "metrics", to: "ast", count: 40, p75: 60 },
      { from: "three", to: "ast", count: 120, p75: 70 },
    ],
    vitals: {
      LCP: { p75: 1180, good: 0.94, samples: 600 },
      INP: { p75: 96, good: 0.97, samples: 410 },
      CLS: { p75: 0.002, good: 0.99, samples: 590 },
    },
    series,
  };
}

function fakeMetrics(manifest: TargetManifest, lifetime: AbortSignal) {
  const events: TelemetryEvent[] = [];
  const subscribers = new Set<(e: TelemetryEvent) => void>();
  const t0 = performance.timeOrigin;
  const push = (name: string, at: number, target: string | null, props: TelemetryProps) => {
    const e: TelemetryEvent = Object.freeze({
      name,
      ts: Math.round(t0 + at),
      sid: "f00dfeedcafe0001",
      target,
      targetVersion: target === manifest.id ? manifest.version : target ? "1.0.0" : null,
      shellVersion: "0.0.0-harness",
      contentHash: "harness",
      device: "desktop",
      conn: "4g",
      props: Object.freeze({ ...props }),
    });
    events.push(e);
    for (const fn of [...subscribers]) fn(e);
  };
  const load = (id: string, at: number, cache: string) =>
    push("target_load", at, id, { id, manifestMs: 18, entryMs: 120, mountMs: 40, readyMs: 22, totalMs: 200, cache, outcome: "ok" });

  push("vital", 90, null, { name: "TTFB", value: 84, rating: "good", route: "/t/ast" });
  push("ir_ready", 210, null, { ms: 210, bytes: 83_000 });
  load("ast", 480, "cold");
  push("vital", 900, "ast", { name: "LCP", value: 640, rating: "good", route: "/t/ast" });
  push("t.ast.mode", 1400, "ast", { mode: "parse" });

  const client: MetricsClient = {
    live(fn) {
      subscribers.add(fn);
      for (const e of [...events]) fn(e);
      const off = () => void subscribers.delete(fn);
      lifetime.addEventListener("abort", off, { once: true });
      return off;
    },
    sending: { on: true },
    summary: (window, signal) =>
      new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(signal.reason);
        // A beat of latency, so the loading state is visible in the harness.
        const t = setTimeout(() => resolve(fakeSummary(window)), 120);
        signal?.addEventListener("abort", () => (clearTimeout(t), reject(signal.reason)), { once: true });
      }),
  };
  return {
    client,
    /** The shell reports the switch and the load after the target is ready. */
    loaded() {
      const now = performance.now();
      push("target_switch", now, manifest.id, { from: "ast", to: manifest.id, ms: 160, vt: false });
      load(manifest.id, now, "prefetched");
    },
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

      const metrics = manifest.capabilities.includes("metrics-read") ? fakeMetrics(manifest, lifetime.signal) : null;
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
          if (readyCount === 1) queueMicrotask(() => metrics?.loaded());
          markReady();
        },
        ...(metrics && { data: Object.freeze({ metrics: metrics.client }) }),
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
