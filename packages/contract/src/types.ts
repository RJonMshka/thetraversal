import type { IRClient } from "@tv/ir/client";

// ── Target contract (LLD-02) ───────────────────────────────────────────
// The ABI between the shell and every target. Breaking changes bump
// CONTRACT_VERSION and update every target in the same PR.

export const CONTRACT_VERSION = 1;

// ── Manifest (§2) ──────────────────────────────────────────────────────

export type Capability =
  | "webgl"
  | "webgl2"
  | "offscreen-canvas"
  | "audio"
  | "llm" // shell exposes ctx.llm
  | "metrics-read"; // shell exposes ctx.data.metrics

export interface TargetManifest {
  id: string; // permanent: it is a URL segment
  label: string;
  flag: string; // "--target=three", shown in the switcher
  description: string;
  version: string; // target's own semver
  contract: typeof CONTRACT_VERSION;
  ir: string; // semver range of the IR schema, e.g. ">=1.0.0 <2.0.0"
  entry: {
    kind: "mf" | "esm" | "local"; // "local": in the shell bundle (Phase 3 only)
    remote: string; // MF remote name, e.g. "tv_three"
    expose: string; // "./mount"
    url: string; // relative to /_t/<id>/
  };
  capabilities: Capability[];
  budget: { jsKbGz: number };
  urlParams: string[]; // target-owned query keys
  a11y: "full" | "partial" | "decorative";
  motion: "safe" | "reduced-variant" | "static-fallback";
  isolation: "shadow";
}

// ── Module shape (§3) ──────────────────────────────────────────────────

export type FocusSource = "url" | "shell-chrome" | "target" | "llm";

export interface TargetModule {
  mount(root: ShadowRoot, ctx: TargetContext): Promise<TargetHandle> | TargetHandle;
}

export interface TargetHandle {
  /** Shell changed focus (URL nav, context window click, another target's request). */
  setFocus(id: string | null, meta: { source: FocusSource }): void;
  /** Theme or font changed. CSS vars are already updated; this is for targets that cache colors. */
  onTheme?(theme: ThemeSnapshot): void;
  /** Target-owned URL params changed through back/forward. */
  onParams?(params: Readonly<Record<string, string>>): void;
  /** Tab hidden or target kept warm offscreen. Stop rAF loops, pause audio. */
  suspend?(): void;
  resume?(): void;
  /** Must release everything: listeners, rAF, workers, WebGL contexts, object URLs. */
  unmount(): Promise<void> | void;
}

// ── Context (§4) ───────────────────────────────────────────────────────
// `llm` and `data.metrics` join the context with their phases (8 and 6),
// as optional fields, which is not a breaking change. `data.metrics`
// arrived in Phase 6a.

export interface TargetContext {
  readonly id: string;
  readonly ir: IRClient;
  readonly focus: string | null; // initial focus
  readonly visited: readonly string[]; // entities visited this session, oldest first
  readonly inset: ChromeInset; // area of the root covered by shell chrome
  readonly params: Readonly<Record<string, string>>; // only keys in manifest.urlParams
  readonly theme: ThemeSnapshot;
  readonly env: TargetEnv;
  readonly signal: AbortSignal; // aborted when unmount begins

  readonly nav: Navigator;
  readonly bus: Bus;
  readonly storage: ScopedStorage; // sessionStorage under tv.t.<id>.*
  readonly telemetry: TargetTelemetry;

  /** Call once the first meaningful frame is painted. */
  ready(): void;

  /** Only with capability "metrics-read" (LLD-05 §5). */
  readonly data?: { readonly metrics?: MetricsClient };
}

export interface Navigator {
  focus(id: string): void; // request focus change; shell updates URL with replace
  open(id: string): void; // go to /node/<id>
  switchTarget(target: string, opts?: { focus?: string }): void;
  setParam(key: string, value: string | null): void; // allowlisted keys only
  external(url: string): void; // new tab with noopener
}

export interface TargetEnv {
  reducedMotion: boolean;
  colorScheme: "dark" | "light";
  viewport: { width: number; height: number; dpr: number };
  pointer: "fine" | "coarse";
  saveData: boolean;
}

export interface ThemeSnapshot {
  name: string; // "mint", "paper", ...
  font: string;
  /** Resolved values for canvas/WebGL targets that cannot read CSS vars per frame. */
  colors: { bg: string; card: string; text: string; mute: string; accent: string; line: string };
  /**
   * Syntax colors (the --syntax-* vars), for targets that color by category.
   * Optional so a target built against an older shell still mounts: fall back
   * to `colors` when it is missing. Added in Phase 5, not a breaking change.
   */
  syntax?: { keyword: string; string: string; ident: string; type: string };
}

/** CSS px of the target's root covered by shell chrome (e.g. the context window). */
export interface ChromeInset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ScopedStorage {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

export interface TargetTelemetry {
  mark(name: string): void; // namespaced as t.<id>.<name>
  event(name: string, props?: Record<string, string | number | boolean>): void;
}

// ── Telemetry events and the metrics client (LLD-05 §1, §5) ────────────

export type TelemetryProps = Readonly<Record<string, string | number | boolean>>;

/**
 * One event as the shell records it. Shell events are `ir_ready`,
 * `target_load`, `target_switch`, `target_error` and `vital`; target
 * events are `t.<id>.<name>`. No free-text messages: errors carry a code
 * and a hash of the message.
 */
export interface TelemetryEvent {
  readonly name: string;
  /** Wall-clock ms (performance.timeOrigin + performance.now()). */
  readonly ts: number;
  /** Session hash: per tab, not linkable across days. */
  readonly sid: string;
  /** Target active when the event happened, or null (landing, /node pages). */
  readonly target: string | null;
  readonly targetVersion: string | null;
  readonly shellVersion: string;
  readonly contentHash: string;
  readonly device: "desktop" | "mobile" | "tablet";
  /** navigator.connection.effectiveType, or "unknown". */
  readonly conn: string;
  readonly props: TelemetryProps;
}

/** Whether this tab's events leave the browser, and if not, why. */
export type TelemetrySending =
  | { readonly on: true }
  | { readonly on: false; readonly why: "no-ingest" | "privacy" | "sampled-out" };

export type MetricsWindow = "24h" | "7d" | "30d";

export interface Percentiles {
  readonly p50: number;
  readonly p75: number;
  readonly p95: number;
}

/** Aggregates over every visitor's events (LLD-05 §5). Times in ms. */
export interface MetricsSummary {
  readonly window: MetricsWindow;
  /** When the aggregate was computed (wall-clock ms). */
  readonly generatedAt: number;
  readonly sessions: number;
  readonly targets: ReadonlyArray<{
    readonly id: string;
    readonly loads: number;
    readonly loadMs: Percentiles;
    readonly loadBreakdownP75: { readonly manifest: number; readonly entry: number; readonly mount: number; readonly ready: number };
    /** target_error / target_load, 0..1. */
    readonly errorRate: number;
    readonly topErrors: ReadonlyArray<{ readonly code: string; readonly count: number }>;
  }>;
  readonly switches: ReadonlyArray<{ readonly from: string; readonly to: string; readonly count: number; readonly p75: number }>;
  /** `good` is the share (0..1) meeting the Core Web Vitals threshold; null p75 when there are no samples. */
  readonly vitals: Readonly<Record<"LCP" | "INP" | "CLS", { readonly p75: number | null; readonly good: number; readonly samples: number }>>;
  /** Hourly buckets for 24h, daily otherwise; `bucket` is an ISO timestamp of the bucket start. */
  readonly series: ReadonlyArray<{ readonly bucket: string; readonly target: string; readonly p75LoadMs: number }>;
}

/**
 * Why `summary()` rejected: no event store is connected ("no-store"), or
 * the request failed ("unavailable"). The error's `message` is the reason.
 */
export type MetricsSummaryError = "no-store" | "unavailable";

/**
 * Given to targets that declare "metrics-read". Phase 6a shipped the live
 * view of this tab's events; Phase 6b adds `summary()` over the event
 * store, optional so a target built now still mounts in an older shell.
 */
export interface MetricsClient {
  /**
   * This tab's events: first every event already recorded (oldest first,
   * up to the last 200), then each new one as it happens. Returns an
   * unsubscribe; the shell also unsubscribes on unmount.
   */
  live(fn: (e: TelemetryEvent) => void): () => void;
  readonly sending: TelemetrySending;
  /**
   * Every visitor's events, aggregated over a window. Rejects with an
   * Error whose message is a MetricsSummaryError. Added in Phase 6b.
   */
  summary?(window: MetricsWindow, signal?: AbortSignal): Promise<MetricsSummary>;
}

// ── Bus (§5) ───────────────────────────────────────────────────────────

export type ShellEvent =
  | { type: "focus:changed"; id: string | null; source: FocusSource }
  | { type: "entity:visited"; id: string }
  | { type: "theme:changed"; theme: ThemeSnapshot }
  | { type: "target:changed"; from: string | null; to: string }
  | { type: "visibility"; hidden: boolean }
  | { type: "traversal:reset" } // the visitor cleared their history
  | { type: "chrome:inset"; inset: ChromeInset };

export type ShellEventType = ShellEvent["type"];
export type ShellEventOf<T extends ShellEventType> = Extract<ShellEvent, { type: T }>;

/** Read-only for targets: every write goes through `nav` or `telemetry`. */
export interface Bus {
  on<T extends ShellEventType>(type: T, fn: (e: ShellEventOf<T>) => void): () => void;
}
