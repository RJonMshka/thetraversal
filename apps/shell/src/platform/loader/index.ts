import type { TargetManifest, TargetModule } from "@tv/contract";
import type { TargetId } from "@/platform/registry";
import { mfLoader } from "@/platform/loader/mf";

// ── Target loader (LLD-03 §4) ──────────────────────────────────────────
// Every target is a separate deployment loaded through Module Federation
// (Phase 4). The interface leaves room for a plain import() strategy.

export interface TargetLoader {
  manifest(id: TargetId, signal: AbortSignal): Promise<TargetManifest>;
  load(m: TargetManifest, signal: AbortSignal): Promise<TargetModule>;
  prefetch(m: TargetManifest): void;
}

export const loader: TargetLoader = mfLoader;
