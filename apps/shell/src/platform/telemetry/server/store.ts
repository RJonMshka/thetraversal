import type { MetricsSummary, MetricsWindow, TelemetryEvent } from "@tv/contract";
import { summarize } from "@/platform/telemetry/server/summarize";

// ── Event store (LLD-05 §4) ────────────────────────────────────────────
// The ingest route and the summary API talk to this interface only. Which
// database backs it is HLD open question 2 (Supabase Postgres or Upstash
// Redis); until that is decided, the only adapter is "memory", for local
// development and previews. With TELEMETRY_STORE unset there is no store:
// the shell does not send, and the summary API answers 503.

export interface EventStore {
  readonly kind: string;
  insert(events: readonly TelemetryEvent[]): Promise<void>;
  summary(window: MetricsWindow, now?: number): Promise<MetricsSummary>;
}

export const RETENTION_MS = 90 * 24 * 3600_000;

/**
 * Per server instance and lost on restart, so only for development and
 * previews. Keeps at most `cap` events, oldest dropped first.
 */
export function memoryStore(cap = 50_000): EventStore {
  let events: TelemetryEvent[] = [];
  return {
    kind: "memory",
    async insert(batch) {
      events.push(...batch);
      if (events.length > cap) events = events.slice(-cap);
    },
    async summary(window, now = Date.now()) {
      events = events.filter((e) => e.ts >= now - RETENTION_MS);
      return summarize(events, window, now);
    },
  };
}

// One store per server instance; survives dev hot reloads.
const slot = globalThis as typeof globalThis & { __tvEventStore?: EventStore | null };

export function getStore(kind = process.env.TELEMETRY_STORE): EventStore | null {
  if (slot.__tvEventStore !== undefined) return slot.__tvEventStore;
  let store: EventStore | null = null;
  if (kind === "memory") store = memoryStore();
  else if (kind) console.warn(`TELEMETRY_STORE=${kind} has no adapter yet; telemetry stays off.`);
  slot.__tvEventStore = store;
  return store;
}
