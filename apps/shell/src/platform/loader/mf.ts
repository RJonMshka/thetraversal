import type { ModuleFederation } from "@module-federation/runtime";
import { TargetError, parseManifest, type TargetManifest, type TargetModule } from "@tv/contract";
import type { TargetLoader } from "@/platform/loader";

// ── Module Federation strategy (LLD-03 §4) ─────────────────────────────
// Targets are separate deployments served same-origin under /_t/<id>/
// (a rewrite in next.config.ts). The shell reads manifest.json, then
// loads the target's ESM remote entry with the MF runtime and imports
// its exposed ./mount. Nothing is shared with remotes (ADR-8).

/** Where a target's files are served from, through the shell's rewrite. */
export function targetUrl(id: string, file: string): string {
  return `/_t/${id}/${file}`;
}

let federation: Promise<ModuleFederation> | null = null;

// Client only, created on first use. The runtime is its own chunk, so
// pages that mount no target never download it.
function mf(): Promise<ModuleFederation> {
  federation ??= import("@module-federation/runtime").then(({ createInstance }) =>
    createInstance({ name: "tv_shell", remotes: [] })
  );
  return federation;
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

// Cached for the page lifetime; a failed request is forgotten so the
// next visit can try again.
const manifests = new Map<string, Promise<TargetManifest>>();
// Remotes whose entry failed to load once: the retry bypasses the cache.
const failed = new Set<string>();
const registered = new Set<string>();

async function fetchManifest(id: string, signal: AbortSignal): Promise<TargetManifest> {
  // no-cache: revalidate, so a redeployed target is picked up on the next visit.
  const res = await fetch(targetUrl(id, "manifest.json"), { cache: "no-cache", signal });
  if (!res.ok) throw new TargetError("T0004", id, `manifest.json returned ${res.status}`);
  try {
    return parseManifest(await res.json());
  } catch (err) {
    throw new TargetError("T0004", id, err instanceof Error ? err.message : "invalid manifest.json", { cause: err });
  }
}

export const mfLoader: TargetLoader = {
  manifest(id, signal) {
    let pending = manifests.get(id);
    if (!pending) {
      // The shared request is not tied to one caller's signal.
      pending = fetchManifest(id, new AbortController().signal);
      manifests.set(id, pending);
      pending.catch(() => manifests.delete(id));
    }
    return abortable(pending, signal);
  },

  async load(m, signal) {
    if (m.entry.kind !== "mf") throw new TargetError("T0004", m.id, `entry kind '${m.entry.kind}' is not supported`);
    const { remote, expose } = m.entry;
    const retry = failed.has(remote);
    const entry = targetUrl(m.id, m.entry.url) + (retry ? `?r=${Date.now()}` : "");
    try {
      const federation = await abortable(mf(), signal);
      if (retry || !registered.has(remote)) {
        federation.registerRemotes([{ name: remote, entry, type: "module" }], { force: retry });
        registered.add(remote);
      }
      const mod = await abortable(federation.loadRemote<{ default?: TargetModule }>(`${remote}/${expose.replace(/^\.\//, "")}`), signal);
      if (typeof mod?.default?.mount !== "function") throw new TargetError("T0004", m.id, "module has no mount()");
      failed.delete(remote);
      return mod.default;
    } catch (err) {
      if (!signal.aborted) failed.add(remote);
      throw err;
    }
  },

  prefetch(m) {
    // A modulepreload hint for the remote entry; the browser dedupes it
    // with the later import. The shell owns document.head.
    const href = targetUrl(m.id, m.entry.url);
    if (document.head.querySelector(`link[rel="modulepreload"][href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "modulepreload";
    link.href = href;
    document.head.append(link);
  },
};
