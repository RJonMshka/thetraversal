import { createRateLimiter, MAX_BODY_BYTES, parseBatch } from "@/platform/telemetry/server/ingest";
import { getStore } from "@/platform/telemetry/server/store";

// ── POST /api/t: telemetry ingest (LLD-05 §3) ──────────────────────────
// sendBeacon ignores the response, so statuses are for tests and logs.
// The request's IP and user agent are never read.

export const runtime = "nodejs";

const limiter = createRateLimiter();

export async function POST(req: Request): Promise<Response> {
  const store = getStore();
  if (!store) return new Response(null, { status: 503 });

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return new Response(null, { status: 413 });

  const result = parseBatch(await req.text());
  if (!result.ok) return Response.json({ error: result.reason }, { status: result.status });
  if (!limiter.allow(result.events[0]!.sid)) return new Response(null, { status: 429 });

  try {
    await store.insert(result.events);
  } catch (err) {
    console.error("telemetry insert failed", err);
    return new Response(null, { status: 502 });
  }
  return new Response(null, { status: 204 });
}
