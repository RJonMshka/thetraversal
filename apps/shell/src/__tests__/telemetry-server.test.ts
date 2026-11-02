import { describe, expect, it } from "vitest";
import type { TelemetryEvent, TelemetryProps } from "@tv/contract";
import { MAX_EVENTS, createRateLimiter, parseBatch } from "@/platform/telemetry/server/ingest";
import { getStore, memoryStore } from "@/platform/telemetry/server/store";
import { bucketOf, percentile, summarize } from "@/platform/telemetry/server/summarize";

const NOW = Date.UTC(2026, 10, 1, 12, 0, 0);
const HOUR = 3600_000;

function ev(name: string, props: TelemetryProps, over: Partial<TelemetryEvent> = {}): TelemetryEvent {
  return {
    name,
    ts: NOW - 1000,
    sid: "0123456789abcdef",
    target: "ast",
    targetVersion: "1.0.1",
    shellVersion: "1.0.0",
    contentHash: "abc",
    device: "desktop",
    conn: "4g",
    props,
    ...over,
  };
}

const load = (id: string, totalMs: number, over: Partial<TelemetryEvent> = {}, outcome = "ok") =>
  ev(
    "target_load",
    { id, manifestMs: 10, entryMs: totalMs - 40, mountMs: 20, readyMs: 10, totalMs, cache: "cold", outcome },
    { target: id, ...over }
  );

const body = (events: unknown[]) => JSON.stringify({ events });

describe("ingest (LLD-05 §3)", () => {
  it("accepts a valid batch of shell and target events", () => {
    const r = parseBatch(
      body([
        load("ast", 200),
        ev("target_switch", { from: "ast", to: "three", ms: 80, vt: false }),
        ev("vital", { name: "CLS", value: 0.01, rating: "good", route: "/t/ast" }),
        ev("t.three.first_frame", { ms: 12 }),
      ]),
      NOW
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.events).toHaveLength(4);
  });

  it("rejects oversized bodies, too many events, unknown names and bad props", () => {
    expect(parseBatch("x".repeat(33 * 1024), NOW)).toMatchObject({ ok: false, status: 413 });
    expect(parseBatch(body(Array.from({ length: MAX_EVENTS + 1 }, () => load("ast", 100))), NOW)).toMatchObject({ ok: false, status: 400 });
    expect(parseBatch(body([ev("page_view", {})]), NOW)).toMatchObject({ ok: false, reason: "unknown event page_view" });
    expect(parseBatch(body([ev("t.nope.x", {})]), NOW)).toMatchObject({ ok: false });
    expect(parseBatch(body([ev("target_switch", { from: "ast", to: "three", ms: 1, vt: false, ua: "x" })]), NOW)).toMatchObject({ ok: false });
    expect(parseBatch(body([ev("target_error", { id: "ast", code: "T0005", phase: "mounting", msg: "secret" })]), NOW)).toMatchObject({
      ok: false,
    });
    expect(parseBatch("{not json", NOW)).toMatchObject({ ok: false, reason: "not JSON" });
  });

  it("caps target events at 8 scalar props", () => {
    const props = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`k${i}`, i]));
    expect(parseBatch(body([ev("t.ast.x", props)]), NOW)).toMatchObject({ ok: false });
  });

  it("rejects timestamps far from now and mixed sessions", () => {
    expect(parseBatch(body([load("ast", 100, { ts: NOW - 72 * HOUR })]), NOW)).toMatchObject({ ok: false, reason: "ts out of range" });
    expect(parseBatch(body([load("ast", 100, { ts: NOW + HOUR })]), NOW)).toMatchObject({ ok: false });
    expect(parseBatch(body([load("ast", 100), load("ast", 100, { sid: "fedcba9876543210" })]), NOW)).toMatchObject({
      ok: false,
      reason: "one session per batch",
    });
  });

  it("rate limits per key in a fixed window", () => {
    const rl = createRateLimiter(2, 1000);
    expect([rl.allow("a", 0), rl.allow("a", 1), rl.allow("a", 2), rl.allow("b", 2)]).toEqual([true, true, false, true]);
    expect(rl.allow("a", 1000)).toBe(true);
  });
});

describe("summary (LLD-05 §5)", () => {
  it("interpolates percentiles like percentile_cont", () => {
    expect(percentile([], 0.5)).toBe(0);
    expect(percentile([10], 0.95)).toBe(10);
    expect(percentile([1, 2, 3, 4], 0.75)).toBeCloseTo(3.25);
    expect(percentile([4, 1, 3, 2], 0.5)).toBeCloseTo(2.5);
  });

  it("aggregates loads, errors, switches and vitals inside the window", () => {
    const events = [
      load("ast", 100, { sid: "a".repeat(16) }),
      load("ast", 200, { sid: "a".repeat(16) }),
      load("ast", 300, { sid: "b".repeat(16) }),
      load("three", 400, {}, "T0004"),
      ev("target_error", { id: "three", code: "T0004", phase: "loading", msgHash: "deadbeef" }),
      ev("target_switch", { from: "ast", to: "three", ms: 50, vt: false }),
      ev("target_switch", { from: "ast", to: "three", ms: 150, vt: false }),
      ev("vital", { name: "LCP", value: 1000, rating: "good", route: "/" }),
      ev("vital", { name: "LCP", value: 3000, rating: "needs-improvement", route: "/" }),
      ev("vital", { name: "TTFB", value: 80, rating: "good", route: "/" }),
      load("ast", 9999, { ts: NOW - 2 * 24 * HOUR }), // outside 24h
    ];
    const s = summarize(events, "24h", NOW);
    expect(s.sessions).toBe(3);
    const ast = s.targets.find((t) => t.id === "ast")!;
    expect(ast).toMatchObject({ loads: 3, loadMs: { p50: 200, p75: 250 }, errorRate: 0 });
    expect(ast.loadBreakdownP75).toEqual({ manifest: 10, entry: 210, mount: 20, ready: 10 });
    const three = s.targets.find((t) => t.id === "three")!;
    expect(three).toMatchObject({ loads: 1, errorRate: 1, topErrors: [{ code: "T0004", count: 1 }], loadMs: { p75: 0 } });
    expect(s.switches).toEqual([{ from: "ast", to: "three", count: 2, p75: 125 }]);
    expect(s.vitals.LCP).toEqual({ p75: 2500, good: 0.5, samples: 2 });
    expect(s.vitals.INP).toEqual({ p75: null, good: 0, samples: 0 });
    expect(s.series).toEqual([{ bucket: bucketOf(NOW - 1000, "24h"), target: "ast", p75LoadMs: 250 }]);
    expect(summarize(events, "7d", NOW).targets.find((t) => t.id === "ast")!.loads).toBe(4);
  });

  it("buckets by hour for 24h and by UTC day otherwise", () => {
    expect(bucketOf(NOW + 25 * 60_000, "24h")).toBe("2026-11-01T12:00:00.000Z");
    expect(bucketOf(NOW, "7d")).toBe("2026-11-01T00:00:00.000Z");
  });
});

describe("store (LLD-05 §4)", () => {
  it("memory store keeps the newest events up to its cap", async () => {
    const store = memoryStore(2);
    await store.insert([load("ast", 100), load("ast", 200), load("ast", 300)]);
    const s = await store.summary("24h", NOW);
    expect(s.targets[0]).toMatchObject({ loads: 2, loadMs: { p50: 250 } });
  });

  it("has no store unless TELEMETRY_STORE names an adapter", () => {
    const slot = globalThis as { __tvEventStore?: unknown };
    delete slot.__tvEventStore;
    expect(getStore(undefined)).toBeNull();
    delete slot.__tvEventStore;
    expect(getStore("memory")?.kind).toBe("memory");
    delete slot.__tvEventStore;
  });
});
