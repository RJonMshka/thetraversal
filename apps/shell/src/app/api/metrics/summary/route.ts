import { getStore } from "@/platform/telemetry/server/store";
import { isWindow } from "@/platform/telemetry/server/summarize";

// ── GET /api/metrics/summary?window=24h|7d|30d (LLD-05 §5) ─────────────
// Aggregates for the metrics target. 503 { error: "no-store" } while no
// event store is connected.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const window = new URL(req.url).searchParams.get("window") ?? "7d";
  if (!isWindow(window)) return Response.json({ error: "window must be 24h, 7d or 30d" }, { status: 400 });

  const store = getStore();
  if (!store) return Response.json({ error: "no-store" }, { status: 503, headers: { "Cache-Control": "no-store" } });

  try {
    const summary = await store.summary(window);
    return Response.json(summary, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch (err) {
    console.error("telemetry summary failed", err);
    return Response.json({ error: "unavailable" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
