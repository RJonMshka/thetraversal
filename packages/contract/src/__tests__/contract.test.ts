import { describe, expect, it, vi } from "vitest";
import { TargetError, createBus, satisfiesRange } from "../index";

describe("satisfiesRange", () => {
  it.each([
    ["1.0.0", ">=1.0.0 <2.0.0", true],
    ["1.9.3", ">=1.0.0 <2.0.0", true],
    ["2.0.0", ">=1.0.0 <2.0.0", false],
    ["0.9.9", ">=1.0.0", false],
    ["1.2.3", "1.2.3", true],
    ["1.2.4", "=1.2.3", false],
    ["1.4.0", "^1.2.0", true],
    ["2.0.0", "^1.2.0", false],
    ["0.2.5", "^0.2.0", true],
    ["0.3.0", "^0.2.0", false],
    ["1.2.9", "~1.2.0", true],
    ["1.3.0", "~1.2.0", false],
    ["3.1.4", "*", true],
    ["not-a-version", "*", false],
    ["1.0.0", ">=banana", false],
  ])("%s in %s → %s", (version, range, expected) => {
    expect(satisfiesRange(version, range)).toBe(expected);
  });
});

describe("createBus", () => {
  it("delivers events to listeners of that type only", () => {
    const bus = createBus();
    const focus = vi.fn();
    const visited = vi.fn();
    bus.on("focus:changed", focus);
    bus.on("entity:visited", visited);
    bus.emit({ type: "focus:changed", id: "kata", source: "url" });
    expect(focus).toHaveBeenCalledWith({ type: "focus:changed", id: "kata", source: "url" });
    expect(visited).not.toHaveBeenCalled();
  });

  it("scope.dispose force-clears a target's subscriptions", () => {
    const bus = createBus();
    const scoped = bus.scope();
    const fn = vi.fn();
    scoped.bus.on("visibility", fn);
    scoped.dispose();
    bus.emit({ type: "visibility", hidden: true });
    expect(fn).not.toHaveBeenCalled();
    // Subscribing after dispose is a no-op.
    scoped.bus.on("visibility", fn);
    bus.emit({ type: "visibility", hidden: false });
    expect(fn).not.toHaveBeenCalled();
  });

  it("an unsubscribe function only removes its own listener", () => {
    const bus = createBus();
    const a = vi.fn();
    const b = vi.fn();
    const offA = bus.on("visibility", a);
    bus.on("visibility", b);
    offA();
    bus.emit({ type: "visibility", hidden: true });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });
});

describe("TargetError", () => {
  it("formats as a compiler diagnostic", () => {
    const err = new TargetError("T0003", "three", "requires webgl2");
    expect(err.message).toBe("error[T0003]: target 'three': requires webgl2");
    expect(err.code).toBe("T0003");
  });
});
