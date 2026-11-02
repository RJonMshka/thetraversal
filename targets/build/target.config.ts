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
  // Real DOM text, buttons and keyboard steps; overlays and the invisible
  // layout copies are aria-hidden, the typed hero has a screen-reader copy,
  // and </body> links every top-level node. No shell entity list beside it.
  a11y: "full",
  // Reduced motion: every chapter in its finished state, no scrubbing.
  motion: "reduced-variant",
});
