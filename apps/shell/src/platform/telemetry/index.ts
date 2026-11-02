import type { TelemetryEvent } from "@tv/contract";
import type { Pipeline } from "@/platform/telemetry/pipeline";

// ── Telemetry, first-load half (LLD-05 §2) ─────────────────────────────
// Everything here ships with the page, so it only records: name, time,
// active target, raw props. The pipeline (session fields, ring buffer,
// live subscribers, batcher, web-vitals) is its own chunk, loaded when
// the page is idle or when a target first asks for live events. It then
// takes over the events queued until then.

export type RawProps = Record<string, string | number | boolean | undefined>;

export interface RawEvent {
  name: string;
  /** performance.now() when it happened. */
  t: number;
  target: string | null;
  targetVersion: string | null;
  /** A function is resolved by the pipeline, for props that cost work to compute. */
  props: RawProps | (() => RawProps);
}

const MAX_QUEUED = 200;
const queue: RawEvent[] = [];
let sink: ((e: RawEvent) => void) | null = null;
let pipeline: Promise<Pipeline> | null = null;
let active: { id: string; version: string } | null = null;
let switching: { from: string; to: string; t: number } | null = null;

/** The route the page was loaded on; web vitals describe that load. */
export const firstRoute = typeof location === "undefined" ? "/" : location.pathname;

export function track(name: string, props: RawEvent["props"] = {}): void {
  const e: RawEvent = { name, t: performance.now(), target: active?.id ?? null, targetVersion: active?.version ?? null, props };
  if (sink) return sink(e);
  queue.push(e);
  if (queue.length > MAX_QUEUED) queue.shift();
}

/** Set by TargetHost once a target is ready; null on pages without one. */
export function setActiveTarget(id: string | null, version = ""): void {
  active = id ? { id, version } : null;
}

/** A switch began (switcher chip, or a target's nav.switchTarget). */
export function switchStarted(from: string, to: string): void {
  if (from !== to) switching = { from, to, t: performance.now() };
}

/** The switch's target is ready (ok) or failed: emit target_switch for a success. */
export function switchEnded(to: string, ok: boolean): void {
  const s = switching;
  if (!s || s.to !== to) return;
  switching = null;
  if (ok) track("target_switch", { from: s.from, to, ms: Math.round(performance.now() - s.t), vt: false });
}

export function startTelemetry(): Promise<Pipeline> {
  pipeline ??= import("@/platform/telemetry/pipeline")
    .then((m) => m.startPipeline())
    .then((p) => {
      for (const e of queue.splice(0)) p.record(e);
      sink = p.record;
      return p;
    });
  return pipeline;
}

/** This tab's events, buffered ones first (MetricsClient.live). */
export function live(fn: (e: TelemetryEvent) => void): () => void {
  let off: (() => void) | null = null;
  let stopped = false;
  startTelemetry().then(
    (p) => {
      if (stopped) return;
      off = p.subscribe(fn);
      // It may have unsubscribed while the buffer replayed.
      if (stopped) off();
    },
    () => {}
  );
  return () => {
    stopped = true;
    off?.();
  };
}
