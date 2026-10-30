import { defineTarget } from "@tv/target-kit/config";

// ── three target manifest (LLD-02 §2) ──────────────────────────────────
// The build adds version (package.json), contract and entry, and writes
// dist/_t/three/manifest.json.

export default defineTarget({
  id: "three",
  label: "Three",
  flag: "--target=three",
  description: "the portfolio as compiler passes: one plane per depth, in 3D",
  ir: ">=1.0.0 <2.0.0",
  capabilities: ["webgl2"],
  // 169 KB gz at Phase 5: three.js core is ~140 of it.
  budget: { jsKbGz: 185 },
  urlParams: [],
  // The shell renders AccessibleEntityList beside it (LLD-03 §2).
  a11y: "partial",
  // Reduced motion: one still frame, camera jumps instead of flying.
  motion: "static-fallback",
});
