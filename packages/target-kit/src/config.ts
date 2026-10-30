import { CONTRACT_VERSION, type TargetManifest } from "@tv/contract";

// ── Target config (LLD-02 §2, LLD-04 §3) ───────────────────────────────
// A target describes itself in target.config.ts. The build turns it into
// manifest.json, adding what the build owns: version, contract, entry.

export type TargetConfig = Omit<TargetManifest, "version" | "contract" | "entry" | "isolation">;

export function defineTarget(config: TargetConfig): TargetConfig {
  return config;
}

/** Dev ports (LLD-04 §3). The shell dev server is on 3000. */
export const TARGET_PORTS: Readonly<Record<string, number>> = {
  ast: 5101,
  three: 5102,
  metrics: 5103,
  art: 5104,
  llm: 5105,
};

export const REMOTE_ENTRY = "remoteEntry.js";

/** MF remote name for a target id (CLAUDE.md §9: tv_<id>). */
export function remoteName(id: string): string {
  return `tv_${id}`;
}

/** Path prefix every target is served under, on its own domain and through the shell rewrite. */
export function targetBase(id: string): string {
  return `/_t/${id}/`;
}

export function toManifest(config: TargetConfig, version: string): TargetManifest {
  return {
    ...config,
    version,
    contract: CONTRACT_VERSION,
    // The shell loads the ESM remote entry directly. mf-manifest.json is
    // still emitted for debugging, but loading through it would add a
    // request and runtime code paths that evaluate strings.
    entry: { kind: "mf", remote: remoteName(config.id), expose: "./mount", url: REMOTE_ENTRY },
    isolation: "shadow",
  };
}
