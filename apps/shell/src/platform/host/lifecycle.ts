import {
  CONTRACT_VERSION,
  TargetError,
  satisfiesRange,
  type ScopedBus,
  type TargetContext,
  type TargetHandle,
  type TargetManifest,
} from "@tv/contract";
import type { IRClient } from "@tv/ir";
import { missingCapabilities } from "@/platform/capabilities";
import type { TargetLoader } from "@/platform/loader";
import type { TargetId } from "@/platform/registry";
import { reportTargetError, toTargetError } from "@/platform/host/errors";

// ── Mount lifecycle (LLD-02 §6) ────────────────────────────────────────
// resolving → loading → mounting → ready, with a timeout and an error
// code per step. Framework-free so it can be tested without a browser.

export const TIMEOUTS = { resolve: 3000, load: 8000, mount: 4000, ready: 4000, unmount: 2000 };

export interface MountedTarget {
  readonly manifest: TargetManifest;
  readonly handle: TargetHandle;
  /** Aborts ctx.signal, drops bus subscriptions, unmounts, empties the root. */
  unmount(): Promise<void>;
}

export interface MountOptions {
  id: TargetId;
  root: ShadowRoot;
  loader: TargetLoader;
  ir: IRClient;
  bus: { scope(): ScopedBus };
  /** Cancels the whole mount; a target that finishes mounting afterwards is unmounted. */
  signal: AbortSignal;
  makeContext(
    manifest: TargetManifest,
    lifecycle: { signal: AbortSignal; bus: ScopedBus["bus"]; ready: () => void }
  ): TargetContext;
  timeouts?: Partial<typeof TIMEOUTS>;
}

function withTimeout<T>(value: Promise<T> | T, ms: number, onTimeout: () => Error): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(onTimeout()), ms);
    Promise.resolve(value).then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/** Contract version, IR range, hardware capabilities (LLD-03 §4), in that order. */
export function runChecks(id: string, m: TargetManifest, ir: IRClient): void {
  if (m.id !== id) throw new TargetError("T0004", id, `manifest is for '${m.id}'`);
  if (m.contract !== CONTRACT_VERSION) {
    throw new TargetError("T0001", id, `built for contract ${m.contract}, shell speaks ${CONTRACT_VERSION}`);
  }
  if (!satisfiesRange(ir.version.schema, m.ir)) {
    throw new TargetError("T0002", id, `needs IR ${m.ir}, shell has ${ir.version.schema}`);
  }
  const missing = missingCapabilities(m.capabilities);
  if (missing.length > 0) throw new TargetError("T0003", id, `requires ${missing.join(", ")}`);
}

/** Calls into target code go through here so a throw never escapes into the shell. */
export function guard(id: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    reportTargetError(toTargetError(err, id, "T0007"));
  }
}

export async function mountTarget(opts: MountOptions): Promise<MountedTarget> {
  const { id, root, loader, ir, signal } = opts;
  const t = { ...TIMEOUTS, ...opts.timeouts };
  const aborted = () => signal.reason ?? new DOMException("Aborted", "AbortError");

  // resolving
  const manifest = await withTimeout(loader.manifest(id, signal), t.resolve, () =>
    new TargetError("T0004", id, "manifest timed out")
  ).catch((err: unknown) => {
    throw signal.aborted ? aborted() : toTargetError(err, id, "T0004");
  });
  runChecks(id, manifest, ir);

  // loading, with one retry
  const load = () =>
    withTimeout(loader.load(manifest, signal), t.load, () => new TargetError("T0004", id, "load timed out"));
  const mod = await load()
    .catch(() => {
      if (signal.aborted) throw aborted();
      return load();
    })
    .catch((err: unknown) => {
      throw signal.aborted ? aborted() : toTargetError(err, id, "T0004");
    });
  if (signal.aborted) throw aborted();

  // mounting
  const lifetime = new AbortController();
  const scope = opts.bus.scope();
  let markReady = () => {};
  const ready = new Promise<void>((resolve) => {
    let called = false;
    markReady = () => {
      if (called) return;
      called = true;
      resolve();
    };
  });
  const ctx = opts.makeContext(manifest, { signal: lifetime.signal, bus: scope.bus, ready: () => markReady() });

  let handle: TargetHandle | undefined;
  let disposed = false;
  const unmount = async () => {
    if (disposed) return;
    disposed = true;
    lifetime.abort();
    scope.dispose();
    try {
      if (handle) {
        await withTimeout(handle.unmount(), t.unmount, () => new TargetError("T0006", id, "unmount timed out"));
      }
    } catch (err) {
      reportTargetError(toTargetError(err, id, "T0006"));
    } finally {
      root.replaceChildren();
    }
  };

  try {
    handle = await withTimeout(mod.mount(root, ctx), t.mount, () => new TargetError("T0005", id, "mount timed out"));
  } catch (err) {
    await unmount();
    throw toTargetError(err, id, "T0005");
  }

  // ready: the shell shows the target anyway after the timeout
  await withTimeout(ready, t.ready, () => new Error("late")).catch(() => {
    if (!signal.aborted) console.warn(`t.${id}.late_ready`);
  });

  if (signal.aborted) {
    await unmount();
    throw aborted();
  }
  const mountedHandle = handle;
  return { manifest, handle: mountedHandle, unmount };
}
