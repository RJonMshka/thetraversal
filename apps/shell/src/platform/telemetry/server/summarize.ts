import type { MetricsSummary, MetricsWindow, Percentiles, TelemetryEvent } from "@tv/contract";

// ── Summary over raw events (LLD-05 §5) ────────────────────────────────
// Pure: the in-memory store aggregates with it, and its numbers are the
// reference for any store that aggregates in SQL. Percentiles interpolate
// between ranks, like Postgres percentile_cont.

export const WINDOWS: readonly MetricsWindow[] = ["24h", "7d", "30d"];
const HOUR = 3600_000;
export const WINDOW_MS: Record<MetricsWindow, number> = { "24h": 24 * HOUR, "7d": 7 * 24 * HOUR, "30d": 30 * 24 * HOUR };

/** Core Web Vitals "good" thresholds; `rating` from web-vitals already applies them. */
const VITALS = ["LCP", "INP", "CLS"] as const;
const TOP_ERRORS = 3;

export function isWindow(w: string | null): w is MetricsWindow {
  return w !== null && (WINDOWS as readonly string[]).includes(w);
}

/** Continuous percentile (0..1) of an unsorted list; 0 for an empty one. */
export function percentile(values: readonly number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = q * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (rank - lo);
}

const round = (n: number) => Math.round(n);
const pcts = (values: readonly number[]): Percentiles => ({
  p50: round(percentile(values, 0.5)),
  p75: round(percentile(values, 0.75)),
  p95: round(percentile(values, 0.95)),
});
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

function push<K>(map: Map<K, number[]>, key: K, value: number) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

/** Start of the hour (24h) or the UTC day (7d, 30d) containing ts. */
export function bucketOf(ts: number, window: MetricsWindow): string {
  const size = window === "24h" ? HOUR : 24 * HOUR;
  return new Date(Math.floor(ts / size) * size).toISOString();
}

export function summarize(all: readonly TelemetryEvent[], window: MetricsWindow, now = Date.now()): MetricsSummary {
  const since = now - WINDOW_MS[window];
  const events = all.filter((e) => e.ts >= since && e.ts <= now);

  const sessions = new Set<string>();
  const loads = new Map<string, number>();
  const okTotals = new Map<string, number[]>();
  const phases = new Map<string, { manifest: number[]; entry: number[]; mount: number[]; ready: number[] }>();
  const errors = new Map<string, Map<string, number>>();
  const switches = new Map<string, number[]>();
  const vitals = new Map<string, { values: number[]; good: number }>();
  const series = new Map<string, number[]>();

  for (const e of events) {
    sessions.add(e.sid);
    const p = e.props;
    switch (e.name) {
      case "target_load": {
        const id = str(p.id);
        loads.set(id, (loads.get(id) ?? 0) + 1);
        if (p.outcome !== "ok") break;
        push(okTotals, id, num(p.totalMs));
        let ph = phases.get(id);
        if (!ph) phases.set(id, (ph = { manifest: [], entry: [], mount: [], ready: [] }));
        ph.manifest.push(num(p.manifestMs));
        ph.entry.push(num(p.entryMs));
        ph.mount.push(num(p.mountMs));
        ph.ready.push(num(p.readyMs));
        push(series, `${bucketOf(e.ts, window)} ${id}`, num(p.totalMs));
        break;
      }
      case "target_error": {
        const id = str(p.id);
        let codes = errors.get(id);
        if (!codes) errors.set(id, (codes = new Map()));
        codes.set(str(p.code), (codes.get(str(p.code)) ?? 0) + 1);
        break;
      }
      case "target_switch":
        push(switches, `${str(p.from)} ${str(p.to)}`, num(p.ms));
        break;
      case "vital": {
        const name = str(p.name);
        if (!(VITALS as readonly string[]).includes(name)) break;
        let v = vitals.get(name);
        if (!v) vitals.set(name, (v = { values: [], good: 0 }));
        v.values.push(num(p.value));
        if (p.rating === "good") v.good++;
        break;
      }
    }
  }

  const ids = [...new Set([...loads.keys(), ...errors.keys()])].sort();
  const targets = ids.map((id) => {
    const ph = phases.get(id);
    const codes = errors.get(id) ?? new Map<string, number>();
    const errorCount = [...codes.values()].reduce((a, b) => a + b, 0);
    const loadCount = loads.get(id) ?? 0;
    return {
      id,
      loads: loadCount,
      loadMs: pcts(okTotals.get(id) ?? []),
      loadBreakdownP75: {
        manifest: round(percentile(ph?.manifest ?? [], 0.75)),
        entry: round(percentile(ph?.entry ?? [], 0.75)),
        mount: round(percentile(ph?.mount ?? [], 0.75)),
        ready: round(percentile(ph?.ready ?? [], 0.75)),
      },
      errorRate: loadCount > 0 ? Math.min(1, errorCount / loadCount) : errorCount > 0 ? 1 : 0,
      topErrors: [...codes]
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
        .slice(0, TOP_ERRORS),
    };
  });

  const vitalOut = Object.fromEntries(
    VITALS.map((name) => {
      const v = vitals.get(name);
      if (!v) return [name, { p75: null, good: 0, samples: 0 }];
      const p75 = percentile(v.values, 0.75);
      return [name, { p75: name === "CLS" ? Math.round(p75 * 1000) / 1000 : round(p75), good: v.good / v.values.length, samples: v.values.length }];
    })
  ) as MetricsSummary["vitals"];

  return {
    window,
    generatedAt: now,
    sessions: sessions.size,
    targets,
    switches: [...switches]
      .map(([key, values]) => {
        const [from = "", to = ""] = key.split(" ");
        return { from, to, count: values.length, p75: round(percentile(values, 0.75)) };
      })
      .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)),
    vitals: vitalOut,
    series: [...series]
      .map(([key, values]) => {
        const [bucket = "", target = ""] = key.split(" ");
        return { bucket, target, p75LoadMs: round(percentile(values, 0.75)) };
      })
      .sort((a, b) => a.bucket.localeCompare(b.bucket) || a.target.localeCompare(b.target)),
  };
}
