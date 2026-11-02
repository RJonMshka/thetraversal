import { defineTarget } from "@tv/target-kit/config";

// ── build target manifest (LLD-02 §2) ──────────────────────────────────
// The build adds version (package.json), contract and entry, and writes
// dist/_t/build/manifest.json.

export default defineTarget({
  id: "build",
  label: "Build",
  flag: "--target=build",
  description: "the portfolio as a page being written: elements, box model, flex, grid, with the devtools overlay on",
  ir: ">=1.0.0 <2.0.0",
  // Plain DOM and CSS: runs wherever the shell runs.
  capabilities: [],
  budget: { jsKbGz: 50 },
  urlParams: [],
  // Real text in the DOM, but only a slice of the entities: the shell
  // renders AccessibleEntityList beside it.
  a11y: "partial",
  // Reduced motion: every chapter in its finished state, no scrubbing.
  motion: "reduced-variant",
});
