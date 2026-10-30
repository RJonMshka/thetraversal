import type { TargetManifest, TargetModule } from "@tv/contract";
import type { TargetId } from "@/platform/registry";
import { localLoader } from "@/platform/loader/local";

// ── Target loader (LLD-03 §4) ──────────────────────────────────────────
// Phase 3 loads every target from the shell bundle. Phase 4 adds the
// Module Federation strategy behind the same interface.

export interface TargetLoader {
  manifest(id: TargetId, signal: AbortSignal): Promise<TargetManifest>;
  load(m: TargetManifest, signal: AbortSignal): Promise<TargetModule>;
  prefetch(m: TargetManifest): void;
}

export const loader: TargetLoader = localLoader;
