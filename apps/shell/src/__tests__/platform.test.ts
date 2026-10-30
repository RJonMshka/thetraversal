import { describe, expect, it, vi } from "vitest";
import {
  CONTRACT_VERSION,
  createBus,
  isTargetError,
  type TargetContext,
  type TargetHandle,
  type TargetManifest,
  type TargetModule,
} from "@tv/contract";
import { ir } from "@/platform/ir";
import type { TargetLoader } from "@/platform/loader";
import { mountTarget, type MountOptions } from "@/platform/host/lifecycle";
import { createNavigator, pickParams, resolveFocus, targetHref } from "@/platform/focus";

const MANIFEST: TargetManifest = {
  id: "ast",
  label: "AST",
  flag: "--target=ast",
  description: "test",
  version: "0.0.0",
  contract: CONTRACT_VERSION,
  ir: ">=1.0.0 <2.0.0",
  entry: { kind: "local", remote: "tv_ast", expose: "./mount", url: "" },
  capabilities: [],
  budget: { jsKbGz: 100 },
  urlParams: ["mode"],
  a11y: "full",
  motion: "reduced-variant",
  isolation: "shadow",
};

function fakeRoot() {
  return { replaceChildren: vi.fn() } as unknown as ShadowRoot & { replaceChildren: ReturnType<typeof vi.fn> };
}

function setup(module: TargetModule, manifest: Partial<TargetManifest> = {}, extra: Partial<MountOptions> = {}) {
  const loader: TargetLoader = {
    manifest: async () => ({ ...MANIFEST, ...manifest }),
    load: async () => module,
    prefetch: () => {},
  };
  const bus = createBus();
  const abort = new AbortController();
  const contexts: TargetContext[] = [];
  const root = fakeRoot();
  const promise = mountTarget({
    id: "ast",
    root,
    loader,
    ir,
    bus,
    signal: abort.signal,
    makeContext: (m, lifecycle) => {
      const ctx = { ...lifecycle, id: m.id } as unknown as TargetContext;
      contexts.push(ctx);
      return ctx;
    },
    timeouts: { ready: 50, mount: 50, unmount: 50 },
    ...extra,
  });
  return { promise, abort, bus, contexts, root };
}

function handle(overrides: Partial<TargetHandle> = {}): TargetHandle {
  return { setFocus: vi.fn(), unmount: vi.fn(), ...overrides };
}

describe("mountTarget", () => {
  it("mounts, waits for ready, and unmounts cleanly", async () => {
    const h = handle();
    const { promise, contexts, bus, root } = setup({
      mount: (_root, ctx) => {
        ctx.bus.on("visibility", () => {});
        ctx.ready();
        return h;
      },
    });
    const mounted = await promise;
    expect(mounted.handle).toBe(h);
    const listener = vi.fn();
    contexts[0].bus.on("visibility", listener);
    await mounted.unmount();
    expect(contexts[0].signal.aborted).toBe(true);
    expect(h.unmount).toHaveBeenCalledTimes(1);
    expect(root.replaceChildren).toHaveBeenCalled();
    bus.emit({ type: "visibility", hidden: true });
    expect(listener).not.toHaveBeenCalled();
  });

  it("rejects a contract mismatch with T0001 before loading", async () => {
    const mount = vi.fn();
    const { promise } = setup({ mount }, { contract: 2 as typeof CONTRACT_VERSION });
    await expect(promise).rejects.toMatchObject({ code: "T0001" });
    expect(mount).not.toHaveBeenCalled();
  });

  it("rejects an IR range mismatch with T0002", async () => {
    const { promise } = setup({ mount: () => handle() }, { ir: ">=2.0.0" });
    await expect(promise).rejects.toMatchObject({ code: "T0002" });
  });

  it("maps a throwing mount to T0005 and clears the root", async () => {
    const { promise, root } = setup({
      mount: () => {
        throw new Error("boom");
      },
    });
    const err = await promise.catch((e: unknown) => e);
    expect(isTargetError(err) && err.code).toBe("T0005");
    expect(root.replaceChildren).toHaveBeenCalled();
  });

  it("shows a target that never calls ready after the timeout", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { promise } = setup({ mount: () => handle() });
    await expect(promise).resolves.toBeDefined();
    expect(warn).toHaveBeenCalledWith("t.ast.late_ready");
    warn.mockRestore();
  });

  it("unmounts a target that finishes mounting after the mount was cancelled", async () => {
    const h = handle();
    let ctl: AbortController | undefined;
    const { promise, abort } = setup({
      mount: (_root, ctx) => {
        ctl?.abort();
        ctx.ready();
        return h;
      },
    });
    ctl = abort;
    await expect(promise).rejects.toBeDefined();
    expect(h.unmount).toHaveBeenCalledTimes(1);
  });
});

describe("focus helpers", () => {
  it("drops unknown focus ids", () => {
    expect(resolveFocus("reachble", ir)).toBe("reachble");
    expect(resolveFocus("no-such-entity", ir)).toBeNull();
    expect(resolveFocus(null, ir)).toBeNull();
  });

  it("keeps only target-owned params, in manifest order", () => {
    const search = new URLSearchParams("focus=kata&utm=x&mode=eval");
    expect(pickParams(search, ["mode"])).toEqual({ mode: "eval" });
  });

  it("builds target URLs with params before focus", () => {
    expect(targetHref("ast", {})).toBe("/t/ast");
    expect(targetHref("ast", { params: { mode: "lex" }, focus: "kata" })).toBe("/t/ast?mode=lex&focus=kata");
  });

  it("navigator: focus replaces, open pushes, setParam is allowlisted", () => {
    const replace = vi.fn();
    const push = vi.fn();
    const onFocusRequest = vi.fn();
    let search = new URLSearchParams("mode=parse");
    const nav = createNavigator({
      manifest: MANIFEST,
      ir,
      search: () => search,
      replace: (href) => {
        replace(href);
        search = new URLSearchParams(href.split("?")[1]);
      },
      push,
      onFocusRequest,
      onOpen: () => {},
    });
    nav.focus("reachble");
    expect(onFocusRequest).toHaveBeenCalledWith("reachble", "target");
    expect(replace).toHaveBeenLastCalledWith("/t/ast?mode=parse&focus=reachble");
    nav.focus("no-such-entity");
    expect(replace).toHaveBeenCalledTimes(1);
    nav.setParam("mode", "eval");
    expect(replace).toHaveBeenLastCalledWith("/t/ast?mode=eval&focus=reachble");
    expect(() => nav.setParam("theme", "x")).toThrow(/T0008/);
    nav.open("reachble");
    expect(push).toHaveBeenCalledWith("/node/reachble");
  });
});

