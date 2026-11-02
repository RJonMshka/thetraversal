import { z } from "zod";
import type { TelemetryEvent } from "@tv/contract";
import { TARGETS } from "@/platform/registry";

// ── Ingest validation (LLD-05 §3) ──────────────────────────────────────
// Server only. A batch is accepted whole or rejected whole: over 32 KB,
// over 50 events, an unknown event name, props failing their schema, or
// events from more than one session. Nothing identifying is read from
// the request: the client already sends `device`, so the user agent and
// IP are never looked at.

export const MAX_BODY_BYTES = 32 * 1024;
export const MAX_EVENTS = 50;
/** Events older than this, or this far in the future, mean a broken clock or a replay. */
export const MAX_AGE_MS = 48 * 3600_000;
export const MAX_SKEW_MS = 10 * 60_000;

const TARGET_IDS = new Set<string>(TARGETS.map((t) => t.id));
const TARGET_EVENT = /^t\.([a-z0-9-]+)\.[a-z0-9_.:-]{1,48}$/i;

const id = z.string().regex(/^[a-z0-9-]{1,32}$/);
const ms = z.number().finite().min(0).max(600_000);
const code = z.string().regex(/^(ok|T\d{4})$/);

const SHELL_PROPS = {
  ir_ready: z.object({ ms, bytes: z.number().int().min(0).max(50_000_000) }).strict(),
  target_load: z
    .object({
      id,
      manifestMs: ms,
      entryMs: ms,
      mountMs: ms,
      readyMs: ms,
      totalMs: ms,
      cache: z.enum(["warm-slot", "prefetched", "cold"]),
      outcome: code,
    })
    .strict(),
  target_switch: z.object({ from: id, to: id, ms, vt: z.boolean() }).strict(),
  target_error: z
    .object({ id, code: z.string().regex(/^T\d{4}$/), phase: z.string().max(16), msgHash: z.string().regex(/^[0-9a-f]{8}$/) })
    .strict(),
  vital: z
    .object({
      name: z.enum(["LCP", "INP", "CLS", "TTFB", "FCP"]),
      value: z.number().finite().min(0).max(600_000),
      rating: z.enum(["good", "needs-improvement", "poor"]),
      route: z.string().max(64),
    })
    .strict(),
} as const;

/** t.<id>.<name>: at most 8 props, scalar values, strings up to 64 chars. */
const targetProps = z
  .record(z.string().max(32), z.union([z.string().max(64), z.number().finite(), z.boolean()]))
  .refine((p) => Object.keys(p).length <= 8, "at most 8 props");

const common = z
  .object({
    name: z.string().max(64),
    ts: z.number().int(),
    sid: z.string().regex(/^[0-9a-f]{16}$/),
    target: id.nullable(),
    targetVersion: z.string().max(32).nullable(),
    shellVersion: z.string().max(32),
    contentHash: z.string().max(64),
    device: z.enum(["desktop", "mobile", "tablet"]),
    conn: z.string().max(16),
    props: z.unknown(),
  })
  .strict();

const batch = z.object({ events: z.array(z.unknown()).min(1).max(MAX_EVENTS) }).strict();

export type IngestResult = { ok: true; events: TelemetryEvent[] } | { ok: false; status: 400 | 413; reason: string };

function propsSchema(name: string): z.ZodType | null {
  if (Object.hasOwn(SHELL_PROPS, name)) return SHELL_PROPS[name as keyof typeof SHELL_PROPS];
  const m = TARGET_EVENT.exec(name);
  return m && TARGET_IDS.has(m[1]!) ? targetProps : null;
}

export function parseBatch(body: string, now = Date.now()): IngestResult {
  if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) return { ok: false, status: 413, reason: "body over 32 KB" };
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return { ok: false, status: 400, reason: "not JSON" };
  }
  const outer = batch.safeParse(json);
  if (!outer.success) return { ok: false, status: 400, reason: "expected { events: [1..50] }" };

  const events: TelemetryEvent[] = [];
  for (const raw of outer.data.events) {
    const e = common.safeParse(raw);
    if (!e.success) return { ok: false, status: 400, reason: "bad event fields" };
    const schema = propsSchema(e.data.name);
    if (!schema) return { ok: false, status: 400, reason: `unknown event ${e.data.name.slice(0, 64)}` };
    const props = schema.safeParse(e.data.props);
    if (!props.success) return { ok: false, status: 400, reason: `bad props on ${e.data.name}` };
    if (e.data.ts < now - MAX_AGE_MS || e.data.ts > now + MAX_SKEW_MS) return { ok: false, status: 400, reason: "ts out of range" };
    if (e.data.target !== null && !TARGET_IDS.has(e.data.target)) return { ok: false, status: 400, reason: "unknown target" };
    events.push({ ...e.data, props: props.data as TelemetryEvent["props"] });
  }
  if (new Set(events.map((e) => e.sid)).size > 1) return { ok: false, status: 400, reason: "one session per batch" };
  return { ok: true, events };
}

// ── Rate limit: 60 requests per minute per sid, in memory per instance ──

export interface RateLimiter {
  allow(key: string, now?: number): boolean;
}

export function createRateLimiter(limit = 60, windowMs = 60_000, maxKeys = 10_000): RateLimiter {
  const hits = new Map<string, { start: number; count: number }>();
  return {
    allow(key, now = Date.now()) {
      const h = hits.get(key);
      if (!h || now - h.start >= windowMs) {
        // Bound memory: drop expired windows when the map grows.
        if (hits.size >= maxKeys) {
          for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
          if (hits.size >= maxKeys) return false;
        }
        hits.set(key, { start: now, count: 1 });
        return true;
      }
      h.count++;
      return h.count <= limit;
    },
  };
}
