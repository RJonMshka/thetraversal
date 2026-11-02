import { defineTarget } from "@tv/target-kit/config";

// ── metrics target manifest (LLD-02 §2, LLD-05 §6) ─────────────────────
// The build adds version (package.json), contract and entry, and writes
// dist/_t/metrics/manifest.json.

export default defineTarget({
  id: "metrics",
  label: "Metrics",
  flag: "--target=metrics",
  description: "the platform measuring itself: this session's telemetry, live",
  ir: ">=1.0.0 <2.0.0",
  // The shell attaches ctx.data.metrics only for this grant.
  capabilities: ["metrics-read"],
  // LLD-05 §6: Preact now, plus uPlot when the 6b charts land.
  budget: { jsKbGz: 60 },
  urlParams: [],
  // A real table, buttons and headings: no entity list beside it.
  a11y: "full",
  // Nothing animates.
  motion: "safe",
});
