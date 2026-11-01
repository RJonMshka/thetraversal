import type { MetricsSummary, MetricsSummaryError, MetricsWindow } from "@tv/contract";

// ── MetricsClient.summary (LLD-05 §5) ──────────────────────────────────
// Loaded on the first call, so it costs nothing on pages that never ask.
// Rejects with Error("no-store") when no event store is connected and
// Error("unavailable") for anything else; an abort rejects as the fetch did.

export async function fetchSummary(window: MetricsWindow, signal?: AbortSignal): Promise<MetricsSummary> {
  const fail = (why: MetricsSummaryError) => new Error(why);
  let res: Response;
  try {
    res = await fetch(`/api/metrics/summary?window=${window}`, { signal, headers: { Accept: "application/json" } });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw fail("unavailable");
  }
  if (res.status === 503) throw fail("no-store");
  if (!res.ok) throw fail("unavailable");
  const body = (await res.json()) as MetricsSummary;
  if (body?.window !== window || !Array.isArray(body.targets)) throw fail("unavailable");
  return body;
}
