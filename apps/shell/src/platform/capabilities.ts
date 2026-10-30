import type { Capability } from "@tv/contract";

// ── Capability probes (LLD-02 §2) ──────────────────────────────────────
// Hardware capabilities are probed before any target code downloads.
// Service capabilities (llm, metrics-read) are grants, not probes.

const HARDWARE = new Set<Capability>(["webgl", "webgl2", "offscreen-canvas", "audio"]);
const cache = new Map<Capability, boolean>();

function probe(cap: Capability): boolean {
  try {
    switch (cap) {
      case "webgl":
      case "webgl2": {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext(cap) as WebGLRenderingContext | null;
        // Release the probe context right away; browsers cap live contexts.
        gl?.getExtension("WEBGL_lose_context")?.loseContext();
        return gl !== null;
      }
      case "offscreen-canvas":
        return typeof OffscreenCanvas !== "undefined";
      case "audio":
        return typeof AudioContext !== "undefined";
      default:
        return true;
    }
  } catch {
    return false;
  }
}

export function isHardwareCapability(cap: Capability): boolean {
  return HARDWARE.has(cap);
}

/** Memoized for the page lifetime. */
export function hasCapability(cap: Capability): boolean {
  if (!isHardwareCapability(cap)) return true;
  const known = cache.get(cap);
  if (known !== undefined) return known;
  const result = probe(cap);
  cache.set(cap, result);
  return result;
}

export function missingCapabilities(caps: readonly Capability[]): Capability[] {
  return caps.filter((cap) => !hasCapability(cap));
}
