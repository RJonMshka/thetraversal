import { describe, expect, it, vi } from "vitest";
import type { TelemetryEvent } from "@tv/contract";
import type { RawEvent } from "@/platform/telemetry";
import { BUFFER_SIZE, FLUSH_AT, createPipeline, hashMessage, normalize, routeOf, sessionId } from "@/platform/telemetry/pipeline";
import { privacyOptOut } from "@/platform/telemetry/policy";

const SESSION = { sid: "abc", shellVersion: "1.0.0", contentHash: "h", device: "desktop", conn: "4g" } as const;

function raw(name: string, props: RawEvent["props"] = {}, t = 5): RawEvent {
  return { name, t, target: "ast", targetVersion: "1.0.1", props };
}

describe("telemetry pipeline (LLD-05 §2)", () => {
  it("adds the session fields and wall-clock time", () => {
    const p = createPipeline({ session: SESSION, timeOrigin: 1000, send: null });
    const seen: TelemetryEvent[] = [];
    p.subscribe((e) => seen.push(e));
    p.record(raw("ir_ready", { ms: 5, bytes: 10 }, 5.4));
    expect(seen[0]).toMatchObject({ name: "ir_ready", ts: 1005, sid: "abc", target: "ast", device: "desktop", props: { ms: 5 } });
    expect(Object.isFrozen(seen[0])).toBe(true);
  });

  it("replays the buffer to a late subscriber, then streams, and keeps only the last 200", () => {
    const p = createPipeline({ session: SESSION, timeOrigin: 0, send: null });
    for (let i = 0; i < BUFFER_SIZE + 5; i++) p.record(raw("vital", { value: i }));
    const seen: TelemetryEvent[] = [];
    const off = p.subscribe((e) => seen.push(e));
    expect(seen).toHaveLength(BUFFER_SIZE);
    expect(seen[0]!.props.value).toBe(5);
    p.record(raw("target_load", { id: "metrics" }));
    expect(seen.at(-1)!.name).toBe("target_load");
    off();
    p.record(raw("vital"));
    expect(seen).toHaveLength(BUFFER_SIZE + 1);
  });

  it("drops a subscriber that throws and keeps delivering to the others", () => {
    const p = createPipeline({ session: SESSION, timeOrigin: 0, send: null });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const good = vi.fn();
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    p.subscribe(bad);
    p.subscribe(good);
    p.record(raw("vital"));
    p.record(raw("vital"));
    expect(bad).toHaveBeenCalledTimes(1);
    expect(good).toHaveBeenCalledTimes(2);
    err.mockRestore();
  });

  it("never stores an error message, only its hash", () => {
    const props = normalize("target_error", { id: "three", code: "T0004", msg: "error[T0004]: secret path" });
    expect(props).toEqual({ id: "three", code: "T0004", msgHash: hashMessage("error[T0004]: secret path") });
    expect(hashMessage("a")).toMatch(/^[0-9a-f]{8}$/);
  });

  it("caps target events at 8 props and 64-char strings, and drops bad names", () => {
    const many = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`k${i}`, "x".repeat(100)]));
    const props = normalize("t.ast.mode", many)!;
    expect(Object.keys(props)).toHaveLength(8);
    expect(String(props.k0)).toHaveLength(64);
    expect(normalize("t.ast.has spaces", {})).toBeNull();
    expect(normalize("t.ast.mode", () => ({ lazy: 1 }))).toEqual({ lazy: 1 });
  });

  it("batches: sends at 20 events, on the timer, and on flush; never without a sender", () => {
    const sent: string[] = [];
    let tick = () => {};
    const p = createPipeline({
      session: SESSION,
      timeOrigin: 0,
      send: (body) => sent.push(body),
      setTimer: (fn) => {
        tick = fn;
        return () => {};
      },
    });
    for (let i = 0; i < FLUSH_AT; i++) p.record(raw("vital"));
    expect(sent).toHaveLength(1);
    expect(JSON.parse(sent[0]!).events).toHaveLength(FLUSH_AT);
    p.record(raw("vital"));
    tick();
    expect(sent).toHaveLength(2);
    tick();
    expect(sent).toHaveLength(2);
    p.record(raw("vital"));
    p.flush();
    expect(sent).toHaveLength(3);

    const quiet = createPipeline({ session: SESSION, timeOrigin: 0, send: null });
    for (let i = 0; i < FLUSH_AT * 2; i++) quiet.record(raw("vital"));
    quiet.flush();
  });

  it("derives a 16-char session id per tab and per day", async () => {
    const a = await sessionId("tab", "2026-10-30");
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(await sessionId("tab", "2026-10-30")).toBe(a);
    expect(await sessionId("tab", "2026-10-31")).not.toBe(a);
  });

  it("honors GPC and Do Not Track, and folds /node routes", () => {
    expect(privacyOptOut({ globalPrivacyControl: true } as unknown as Navigator)).toBe(true);
    expect(privacyOptOut({ doNotTrack: "1" } as unknown as Navigator)).toBe(true);
    expect(privacyOptOut({ doNotTrack: null } as unknown as Navigator)).toBe(false);
    expect(routeOf("/node/reachble")).toBe("/node/[slug]");
    expect(routeOf("/t/ast")).toBe("/t/ast");
  });
});
