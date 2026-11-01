import { defineTarget } from "@tv/target-kit/config";

// ── art target manifest (LLD-02 §2, MIGRATION Phase 7) ─────────────────
// The build adds version (package.json), contract and entry, and writes
// dist/_t/art/manifest.json.

export default defineTarget({
  id: "art",
  label: "Art",
  flag: "--target=art",
  description: "the portfolio as dataflow: every entity an emitter, every relation a pull",
  ir: ">=1.0.0 <2.0.0",
  // Canvas 2D only: runs wherever the shell runs.
  capabilities: [],
  budget: { jsKbGz: 40 },
  urlParams: [],
  // Purely visual. The shell renders AccessibleEntityList beside it.
  a11y: "decorative",
  // Reduced motion: one still frame of the whole flow, nothing moves.
  motion: "static-fallback",
});
