import { missingCapabilities } from "@/platform/capabilities";
import { loader } from "@/platform/loader";
import type { TargetId } from "@/platform/registry";

// ── Prefetch policy (LLD-03 §11) ───────────────────────────────────────
// Manifests are tiny and fetched when the page is idle. A target's code is
// fetched when the visitor shows intent (switcher hover or keyboard focus),
// so the switch itself only has to mount. Skipped on Save-Data and 2G, and
// for targets this device cannot run.

type Connection = { saveData?: boolean; effectiveType?: string };

function constrained(): boolean {
  const c = (navigator as Navigator & { connection?: Connection }).connection;
  return c?.saveData === true || c?.effectiveType === "2g" || c?.effectiveType === "slow-2g";
}

const warmed = new Set<TargetId>();

/** Download a target's remote entry and exposed module without mounting it. */
export function prefetchTarget(id: TargetId): void {
  if (warmed.has(id) || constrained()) return;
  warmed.add(id);
  const signal = new AbortController().signal;
  loader
    .manifest(id, signal)
    .then((m) => {
      if (missingCapabilities(m.capabilities).length > 0) return;
      loader.prefetch(m);
      // Loading evaluates the module but mounts nothing; the later mount
      // gets it from the federation runtime's cache.
      return loader.load(m, signal);
    })
    .catch(() => {
      // A failed prefetch is not an error: the real mount retries and reports.
      warmed.delete(id);
    });
}

/** Step 1: fetch every manifest once the page is idle. */
export function prefetchManifests(ids: readonly TargetId[]): () => void {
  if (constrained()) return () => {};
  const run = () => {
    const signal = new AbortController().signal;
    for (const id of ids) loader.manifest(id, signal).catch(() => {});
  };
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(run, { timeout: 4000 });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = window.setTimeout(run, 1500);
  return () => window.clearTimeout(handle);
}
