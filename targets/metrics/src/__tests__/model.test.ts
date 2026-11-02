import { describe as group, expect, it } from "vitest";
import type { TelemetryEvent, TelemetryProps } from "@tv/contract";
import { announcement, describe, matches, mentions, previousTarget, sendingNote, tally, targetIds } from "@/model";

let ts = 1_000;
function ev(name: string, props: TelemetryProps = {}, target: string | null = null): TelemetryEvent {
  return {
    name,
    ts: (ts += 10),
    sid: "s",
    target,
    targetVersion: null,
    shellVersion: "1.0.0",
    contentHash: "h",
    device: "desktop",
    conn: "4g",
    props,
  };
}

const load = (id: string, outcome = "ok") =>
  ev("target_load", { id, manifestMs: 10, entryMs: 100, mountMs: 30, readyMs: 20, totalMs: 160, cache: "cold", outcome }, id);

group("metrics model", () => {
  it("describes a load with its phases, and a failed load as an error", () => {
    const ok = describe(load("ast"));
    expect(ok.text).toBe("ast ready in 160 ms · cold");
    expect(ok.phases).toEqual({ manifest: 10, entry: 100, mount: 30, ready: 20 });
    const bad = describe(load("three", "T0003"));
    expect(bad.failed).toBe(true);
    expect(bad.text).toContain("error[T0003]");
  });

  it("formats vitals, switches and target events", () => {
    expect(describe(ev("vital", { name: "CLS", value: 0.01234, rating: "good", route: "/" })).text).toBe("CLS 0.012 · good · /");
    expect(describe(ev("vital", { name: "LCP", value: 640, rating: "good", route: "/t/ast" })).text).toContain("640 ms");
    expect(describe(ev("target_switch", { from: "ast", to: "metrics", ms: 120 })).text).toBe("ast → metrics in 120 ms");
    expect(describe(ev("t.ast.mode", { mode: "parse" })).text).toBe("mode=parse");
  });

  it("filters by kind; failed loads count as errors", () => {
    const failed = load("three", "T0004");
    expect(matches(failed, "errors")).toBe(true);
    expect(matches(load("ast"), "errors")).toBe(false);
    expect(matches(ev("t.three.first_frame"), "targets")).toBe(true);
    expect(tally([load("ast"), failed, ev("target_error", { code: "T0004" })])).toEqual({ events: 3, loads: 2, switches: 0, errors: 2 });
  });

  it("goes back to the target the visitor switched from", () => {
    const events = [load("ast"), ev("target_switch", { from: "three", to: "metrics", ms: 90 }), load("metrics")];
    expect(previousTarget(events, "metrics")).toBe("three");
    expect(previousTarget([load("ast"), load("metrics")], "metrics")).toBe("ast");
    expect(previousTarget([load("metrics")], "metrics")).toBeNull();
  });

  it("knows which ids are targets, for highlighting", () => {
    const events = [load("ast"), ev("target_switch", { from: "ast", to: "metrics", ms: 90 })];
    expect([...targetIds(events)].sort()).toEqual(["ast", "metrics"]);
    expect(mentions(events[1]!, "metrics")).toBe(true);
    expect(mentions(events[0]!, "metrics")).toBe(false);
  });

  it("explains why nothing is sent, and announces only loads, switches and errors", () => {
    expect(sendingNote({ on: false, why: "privacy" })).toContain("GPC");
    expect(sendingNote({ on: false, why: "no-ingest" })).toContain("not connected");
    expect(announcement(ev("vital", { name: "LCP", value: 1 }))).toBeNull();
    expect(announcement(load("metrics"))).toBe("target load: metrics ready in 160 ms · cold");
  });
});
