import type {
  Bus,
  ChromeInset,
  Navigator as TargetNavigator,
  ScopedStorage,
  TargetContext,
  TargetEnv,
  TargetManifest,
  TargetTelemetry,
  ThemeSnapshot,
} from "@tv/contract";
import type { IRClient } from "@tv/ir";

// ── Context construction (LLD-03 §5) ───────────────────────────────────
// One TargetContext per mount. Everything a target may touch outside its
// root comes through here.

export function createScopedStorage(id: string): ScopedStorage {
  const prefix = `tv.t.${id}.`;
  return {
    get<T>(key: string): T | undefined {
      try {
        const raw = sessionStorage.getItem(prefix + key);
        return raw === null ? undefined : (JSON.parse(raw) as T);
      } catch {
        return undefined;
      }
    },
    set<T>(key: string, value: T) {
      try {
        sessionStorage.setItem(prefix + key, JSON.stringify(value));
      } catch {
        // Private mode or full storage: the target just loses persistence.
      }
    },
    remove(key: string) {
      try {
        sessionStorage.removeItem(prefix + key);
      } catch {
        // Same as above.
      }
    },
  };
}

/** Clears every key a target stored (used when the visitor resets their traversal). */
export function clearScopedStorage(id: string): void {
  try {
    const prefix = `tv.t.${id}.`;
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(prefix)) sessionStorage.removeItem(key);
    }
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

function createTelemetry(id: string): TargetTelemetry {
  return {
    mark(name) {
      try {
        performance.mark(`t.${id}.${name}`);
      } catch {
        // Marks are best effort.
      }
    },
    // Ingest arrives with /api/t in Phase 6.
    event() {},
  };
}

export function readEnv(): TargetEnv {
  const media = (q: string) => window.matchMedia(q).matches;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return {
    reducedMotion: media("(prefers-reduced-motion: reduce)"),
    colorScheme: media("(prefers-color-scheme: light)") ? "light" : "dark",
    viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 },
    pointer: media("(pointer: coarse)") ? "coarse" : "fine",
    saveData: connection?.saveData === true,
  };
}

export interface ContextInput {
  manifest: TargetManifest;
  ir: IRClient;
  focus: string | null;
  params: Readonly<Record<string, string>>;
  visited: readonly string[];
  inset: ChromeInset;
  theme: ThemeSnapshot;
  nav: TargetNavigator;
  bus: Bus;
  signal: AbortSignal;
  ready: () => void;
}

export function buildContext(input: ContextInput): TargetContext {
  const id = input.manifest.id;
  return Object.freeze({
    id,
    ir: input.ir,
    focus: input.focus,
    params: Object.freeze({ ...input.params }),
    visited: Object.freeze([...input.visited]),
    inset: Object.freeze({ ...input.inset }),
    theme: input.theme,
    env: readEnv(),
    signal: input.signal,
    nav: input.nav,
    bus: input.bus,
    storage: createScopedStorage(id),
    telemetry: createTelemetry(id),
    ready: input.ready,
  });
}
