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
// as optional fields, which is not a breaking change.

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
