import { TARGET_ERRORS, type MetricsSummary, type MetricsWindow, type TelemetrySending } from "@tv/contract";

// ── Across-visitors model (LLD-05 §6) ──────────────────────────────────
// Pure functions behind the summary panels: what state the panels are
// in, the switch matrix, CWV verdicts, and the over-time chart geometry.

export const WINDOWS: readonly MetricsWindow[] = ["24h", "7d", "30d"];

export type SummaryState =
  | { kind: "off"; why: "privacy" | "unsupported" }
  | { kind: "loading" }
  | { kind: "no-store" }
  | { kind: "unavailable" }
  | { kind: "ready"; summary: MetricsSummary };

/** Whether to ask for the summary at all (LLD-05 §6 "Empty states"). */
export function summaryOff(sending: TelemetrySending, hasSummary: boolean): SummaryState | null {
  if (!sending.on && sending.why === "privacy") return { kind: "off", why: "privacy" };
  if (!hasSummary) return { kind: "off", why: "unsupported" };
  return null;
}

export function fromError(err: unknown): SummaryState {
  return err instanceof Error && err.message === "no-store" ? { kind: "no-store" } : { kind: "unavailable" };
}

/** Why the across-visitors panels are empty, in the site's voice. */
export function emptyNote(state: SummaryState): string | null {
  switch (state.kind) {
    case "off":
      return state.why === "privacy"
        ? "Your browser asks not to be tracked, so this dashboard stays with your own session."
        : "This shell does not serve the event store yet, so this dashboard shows only your own session.";
    case "no-store":
      return "The event store is not connected yet, so this dashboard shows only your own session, and nothing leaves this tab.";
    case "unavailable":
      return "The event store did not answer. Your own session above is unaffected.";
    case "loading":
      return "loading…";
    case "ready":
      return state.summary.sessions === 0 ? "No visits recorded in this window yet." : null;
  }
}

export function ms(n: number): string {
  return n >= 10_000 ? `${(n / 1000).toFixed(1)} s` : `${Math.round(n)} ms`;
}

export function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** Error code with its LLD-02 §8 meaning. */
export function errorText(code: string): string {
  const known = (TARGET_ERRORS as Record<string, string>)[code];
  return known ? `${code} ${known}` : code;
}

// ── Switch matrix ──────────────────────────────────────────────────────

export interface Matrix {
  ids: string[];
  /** cell(from, to): p75 and count, or null when never seen. */
  cell(from: string, to: string): { p75: number; count: number } | null;
}

export function switchMatrix(summary: MetricsSummary): Matrix {
  const ids = [...new Set(summary.switches.flatMap((s) => [s.from, s.to]))].sort();
  const cells = new Map(summary.switches.map((s) => [`${s.from} ${s.to}`, { p75: s.p75, count: s.count }]));
  return { ids, cell: (from, to) => cells.get(`${from} ${to}`) ?? null };
}

// ── Core Web Vitals ────────────────────────────────────────────────────

export const VITAL_GOOD: Record<"LCP" | "INP" | "CLS", number> = { LCP: 2500, INP: 200, CLS: 0.1 };

export function vitalValue(name: "LCP" | "INP" | "CLS", p75: number | null): string {
  if (p75 === null) return "—";
  return name === "CLS" ? p75.toFixed(3) : ms(p75);
}

export function vitalPasses(name: "LCP" | "INP" | "CLS", p75: number | null): boolean | null {
  return p75 === null ? null : p75 <= VITAL_GOOD[name];
}

// ── Over time ──────────────────────────────────────────────────────────

export interface Chart {
  width: number;
  height: number;
  /** Max of the y axis, rounded up to a readable step. */
  yMax: number;
  buckets: string[];
  lines: Array<{ target: string; points: Array<{ x: number; y: number; bucket: string; value: number }> }>;
}

/** 1, 2 or 5 times a power of ten, at least n. */
export function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(n));
  for (const m of [1, 2, 5, 10]) if (m * p >= n) return m * p;
  return 10 * p;
}

export function chart(summary: MetricsSummary, width: number, height: number, pad = 4): Chart {
  const buckets = [...new Set(summary.series.map((s) => s.bucket))].sort();
  const yMax = niceCeil(Math.max(0, ...summary.series.map((s) => s.p75LoadMs)));
  const x = (i: number) => (buckets.length <= 1 ? width / 2 : pad + (i / (buckets.length - 1)) * (width - 2 * pad));
  const y = (v: number) => height - pad - (v / yMax) * (height - 2 * pad);
  const byTarget = new Map<string, Chart["lines"][number]["points"]>();
  for (const s of summary.series) {
    let points = byTarget.get(s.target);
    if (!points) byTarget.set(s.target, (points = []));
    const i = buckets.indexOf(s.bucket);
    points.push({ x: x(i), y: y(s.p75LoadMs), bucket: s.bucket, value: s.p75LoadMs });
  }
  const lines = [...byTarget]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([target, points]) => ({ target, points: points.sort((a, b) => a.x - b.x) }));
  return { width, height, yMax, buckets, lines };
}

/** "Nov 1" for daily buckets, "14:00" for hourly ones (UTC, like the buckets). */
export function bucketLabel(bucket: string, window: MetricsWindow): string {
  const d = new Date(bucket);
  if (window === "24h") return `${String(d.getUTCHours()).padStart(2, "0")}:00`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
