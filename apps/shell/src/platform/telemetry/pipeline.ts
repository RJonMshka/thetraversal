import { onCLS, onINP, onLCP, onTTFB, type Metric } from "web-vitals";
import type { TelemetryEvent, TelemetryProps } from "@tv/contract";
import { firstRoute, track, type RawEvent } from "@/platform/telemetry";
import { INGEST_URL, sending } from "@/platform/telemetry/policy";

// ── Telemetry pipeline (LLD-05 §2) ─────────────────────────────────────
// Its own chunk, loaded when the page is idle. Turns raw records into
// TelemetryEvents, keeps the last 200 in a ring buffer for live
// subscribers (the metrics target's "This session" panel), and batches
// them to the ingest endpoint when sending is on.

export const BUFFER_SIZE = 200;
export const FLUSH_EVERY_MS = 10_000;
export const FLUSH_AT = 20;
const TARGET_PROPS = 8;
const STRING_MAX = 64;
const TARGET_EVENT = /^t\.[a-z0-9-]+\.[a-z0-9_.:-]{1,48}$/i;

export interface Pipeline {
  record(e: RawEvent): void;
  /** Replays the buffer (oldest first), then delivers each new event. */
  subscribe(fn: (e: TelemetryEvent) => void): () => void;
  /** Sends what is pending now (visibility hidden, tests). */
  flush(): void;
  dispose(): void;
}

export type SessionFields = Pick<TelemetryEvent, "sid" | "shellVersion" | "contentHash" | "device" | "conn">;

export interface PipelineOptions {
  session: SessionFields;
  timeOrigin: number;
  /** Null when events stay in the browser. */
  send: ((body: string) => void) | null;
  setTimer?: (fn: () => void, ms: number) => () => void;
}

/** FNV-1a, 32 bits: error messages are compared by hash, never sent as text. */
export function hashMessage(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Shell props pass as given; target props are capped (LLD-05 §1). Null drops the event. */
export function normalize(name: string, raw: RawEvent["props"]): TelemetryProps | null {
  const props = typeof raw === "function" ? raw() : raw;
  const isTarget = name.startsWith("t.");
  if (isTarget && !TARGET_EVENT.test(name)) return null;
  const out: Record<string, string | number | boolean> = {};
  let n = 0;
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    if (isTarget && (++n > TARGET_PROPS || !["string", "number", "boolean"].includes(typeof value))) continue;
    if (name === "target_error" && key === "msg") {
      out.msgHash = hashMessage(String(value));
      continue;
    }
    out[key] = typeof value === "string" && isTarget ? value.slice(0, STRING_MAX) : value;
  }
  return Object.freeze(out);
}

function defaultTimer(fn: () => void, ms: number): () => void {
  const id = setInterval(fn, ms);
  return () => clearInterval(id);
}

export function createPipeline(opts: PipelineOptions): Pipeline {
  const buffer: TelemetryEvent[] = [];
  const subscribers = new Set<(e: TelemetryEvent) => void>();
  let pending: TelemetryEvent[] = [];
  const stopTimer = opts.send ? (opts.setTimer ?? defaultTimer)(() => flush(), FLUSH_EVERY_MS) : () => {};

  function flush() {
    if (!opts.send || pending.length === 0) return;
    const events = pending;
    pending = [];
    try {
      opts.send(JSON.stringify({ events }));
    } catch {
      // Best effort: a failed send drops the batch.
    }
  }

  function deliver(fn: (e: TelemetryEvent) => void, e: TelemetryEvent) {
    try {
      fn(e);
    } catch (err) {
      // A faulty subscriber stops receiving; the shell's wrapper reports it.
      subscribers.delete(fn);
      console.error(err);
    }
  }

  return {
    record(raw) {
      const props = normalize(raw.name, raw.props);
      if (!props) return;
      const e: TelemetryEvent = Object.freeze({
        name: raw.name,
        ts: Math.round(opts.timeOrigin + raw.t),
        target: raw.target,
        targetVersion: raw.targetVersion,
        ...opts.session,
        props,
      });
      buffer.push(e);
      if (buffer.length > BUFFER_SIZE) buffer.shift();
      if (opts.send) {
        pending.push(e);
        if (pending.length >= FLUSH_AT) flush();
      }
      for (const fn of [...subscribers]) deliver(fn, e);
    },
    subscribe(fn) {
      subscribers.add(fn);
      for (const e of [...buffer]) {
        if (!subscribers.has(fn)) break;
        deliver(fn, e);
      }
      return () => {
        subscribers.delete(fn);
      };
    },
    flush,
    dispose() {
      stopTimer();
      subscribers.clear();
    },
  };
}

// ── Browser wiring ─────────────────────────────────────────────────────

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

/** sha256(random per-tab id + UTC date), first 16 hex chars: not linkable across days. */
export async function sessionId(tab: string, day = new Date().toISOString().slice(0, 10)): Promise<string> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tab + day));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
  } catch {
    // No SubtleCrypto (insecure context): still per tab and per day.
    return (hashMessage(tab + day) + hashMessage(day + tab)).slice(0, 16);
  }
}

function tabId(): string {
  try {
    let id = sessionStorage.getItem("tv.shell.tab");
    if (!id) sessionStorage.setItem("tv.shell.tab", (id = randomId()));
    return id;
  } catch {
    return randomId();
  }
}

function device(): TelemetryEvent["device"] {
  if (!window.matchMedia("(pointer: coarse)").matches) return "desktop";
  return Math.min(screen.width, screen.height) < 600 ? "mobile" : "tablet";
}

/** /node/<slug> pages share one route; target pages keep their id. */
export function routeOf(pathname: string): string {
  return pathname.startsWith("/node/") ? "/node/[slug]" : pathname;
}

function send(body: string) {
  if (!INGEST_URL) return;
  const blob = new Blob([body], { type: "application/json" });
  if (navigator.sendBeacon?.(INGEST_URL, blob)) return;
  fetch(INGEST_URL, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
}

export async function startPipeline(): Promise<Pipeline> {
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  const pipeline = createPipeline({
    session: {
      sid: await sessionId(tabId()),
      shellVersion: process.env.TV_SHELL_VERSION ?? "0.0.0",
      contentHash: process.env.TV_CONTENT_HASH ?? "",
      device: device(),
      conn: conn?.effectiveType ?? "unknown",
    },
    timeOrigin: performance.timeOrigin,
    send: sending().on ? send : null,
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") pipeline.flush();
  });

  // Vitals describe the page load, so they carry the route it happened on.
  const route = routeOf(firstRoute);
  const vital = (m: Metric) =>
    track("vital", {
      name: m.name,
      value: m.name === "CLS" ? Math.round(m.value * 1000) / 1000 : Math.round(m.value),
      rating: m.rating,
      route,
    });
  onTTFB(vital);
  onLCP(vital);
  onINP(vital);
  onCLS(vital);

  return pipeline;
}
