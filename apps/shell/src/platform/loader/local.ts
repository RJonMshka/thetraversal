import { TargetError, type TargetManifest, type TargetModule } from "@tv/contract";
import type { TargetLoader } from "@/platform/loader";
import type { TargetId } from "@/platform/registry";

// ── In-bundle strategy (Phase 3 only) ──────────────────────────────────
// Targets that still live in apps/shell/src/targets/. The module is a
// dynamic import, so it is its own chunk and loads only when mounted.

interface LocalTarget {
  manifest: () => Promise<TargetManifest>;
  module: () => Promise<{ default: TargetModule }>;
}

const LOCAL: Partial<Record<TargetId, LocalTarget>> = {};

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    promise.then(resolve, reject);
  });
}

export const localLoader: TargetLoader = {
  async manifest(id, signal) {
    const entry = LOCAL[id];
    if (!entry) throw new TargetError("T0004", id, "no local build of this target");
    return abortable(entry.manifest(), signal);
  },
  async load(m, signal) {
    const entry = LOCAL[m.id as TargetId];
    if (!entry) throw new TargetError("T0004", m.id, "no local build of this target");
    const mod = await abortable(entry.module(), signal);
    if (typeof mod.default?.mount !== "function") {
      throw new TargetError("T0004", m.id, "module has no mount()");
    }
    return mod.default;
  },
  prefetch(m) {
    void LOCAL[m.id as TargetId]?.module().catch(() => {});
  },
};
