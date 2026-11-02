import { describe, expect, it } from "vitest";
import type { MetricsSummary, MetricsWindow } from "@tv/contract";
import { bucketLabel, chart, emptyNote, errorText, fromError, ms, niceCeil, summaryOff, switchMatrix, vitalPasses, vitalValue } from "@/aggregate";

const NOW = Date.UTC(2026, 10, 1, 12);

function fakeSummary(window: MetricsWindow, generatedAt: number): MetricsSummary {
  const target = { loads: 10, loadMs: { p50: 1, p75: 2, p95: 3 }, loadBreakdownP75: { manifest: 1, entry: 1, mount: 0, ready: 0 }, errorRate: 0, topErrors: [] };
  return {
    window,
    generatedAt,
    sessions: 3,
    targets: [{ id: "ast", ...target }],
    switches: [
      { from: "ast", to: "metrics", count: 51, p75: 140 },
      { from: "ast", to: "three", count: 198, p75: 380 },
      { from: "three", to: "ast", count: 120, p75: 70 },
    ],
    vitals: { LCP: { p75: 1000, good: 1, samples: 1 }, INP: { p75: null, good: 0, samples: 0 }, CLS: { p75: 0, good: 1, samples: 1 } },
    series: [],
  };
}

describe("across-visitors model (LLD-05 §6)", () => {
  it("stays off under GPC/DNT and in shells without summary()", () => {
    expect(summaryOff({ on: false, why: "privacy" }, true)).toEqual({ kind: "off", why: "privacy" });
    expect(summaryOff({ on: true }, false)).toEqual({ kind: "off", why: "unsupported" });
    expect(summaryOff({ on: false, why: "no-ingest" }, true)).toBeNull();
    expect(summaryOff({ on: false, why: "sampled-out" }, true)).toBeNull();
  });

  it("maps rejections to no-store or unavailable", () => {
    expect(fromError(new Error("no-store"))).toEqual({ kind: "no-store" });
    expect(fromError(new Error("boom"))).toEqual({ kind: "unavailable" });
    expect(emptyNote({ kind: "no-store" })).toMatch(/not connected/);
  });

  it("says when a connected store has no visits yet", () => {
    const empty = { ...fakeSummary("24h", NOW), sessions: 0 };
    expect(emptyNote({ kind: "ready", summary: empty })).toMatch(/No visits/);
    expect(emptyNote({ kind: "ready", summary: fakeSummary("24h", NOW) })).toBeNull();
  });

  it("formats times, errors and vitals", () => {
    expect(ms(212.4)).toBe("212 ms");
    expect(ms(12_300)).toBe("12.3 s");
    expect(errorText("T0004")).toBe("T0004 remote failed to load or timed out");
    expect(errorText("T9999")).toBe("T9999");
    expect(vitalValue("CLS", 0.0123)).toBe("0.012");
    expect(vitalValue("LCP", null)).toBe("—");
    expect(vitalPasses("INP", 250)).toBe(false);
    expect(vitalPasses("LCP", 2500)).toBe(true);
  });

  it("builds the switch matrix over every id seen", () => {
    const m = switchMatrix(fakeSummary("7d", NOW));
    expect(m.ids).toEqual(["ast", "metrics", "three"]);
    expect(m.cell("ast", "three")).toEqual({ p75: 380, count: 198 });
    expect(m.cell("metrics", "three")).toBeNull();
  });

  it("lays out one line per target across the buckets", () => {
    const s: MetricsSummary = {
      ...fakeSummary("7d", NOW),
      series: [
        { bucket: "2026-10-30T00:00:00.000Z", target: "ast", p75LoadMs: 100 },
        { bucket: "2026-10-31T00:00:00.000Z", target: "ast", p75LoadMs: 300 },
        { bucket: "2026-10-31T00:00:00.000Z", target: "three", p75LoadMs: 450 },
      ],
    };
    const c = chart(s, 100, 50, 0);
    expect(c.yMax).toBe(500);
    expect(c.buckets).toHaveLength(2);
    expect(c.lines.map((l) => l.target)).toEqual(["ast", "three"]);
    expect(c.lines[0]!.points).toEqual([
      { x: 0, y: 40, bucket: "2026-10-30T00:00:00.000Z", value: 100 },
      { x: 100, y: 20, bucket: "2026-10-31T00:00:00.000Z", value: 300 },
    ]);
    expect(niceCeil(0)).toBe(1);
    expect(niceCeil(201)).toBe(500);
    expect(niceCeil(1000)).toBe(1000);
  });

  it("labels hourly and daily buckets in UTC", () => {
    expect(bucketLabel("2026-11-01T14:00:00.000Z", "24h")).toBe("14:00");
    expect(bucketLabel("2026-11-01T00:00:00.000Z", "30d")).toBe("Nov 1");
  });
});
