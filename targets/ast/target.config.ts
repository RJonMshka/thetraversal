import { defineTarget } from "@tv/target-kit/config";

// ── AST target manifest (LLD-02 §2) ────────────────────────────────────
// The build adds version (package.json), contract and entry, and writes
// dist/_t/ast/manifest.json.

export default defineTarget({
  id: "ast",
  label: "AST",
  flag: "--target=ast",
  description: "the portfolio as a syntax tree: lex, parse, eval",
  ir: ">=1.0.0 <2.0.0",
  capabilities: [],
  // Every JS file the remote ships, gzipped. The AST bundles its own React
  // and Framer Motion (ADR-8): 169 KB at Phase 4, of which ~40 KB (canvas,
  // d3) loads only on desktop. Phase 3's 120 assumed the shell's React.
  budget: { jsKbGz: 180 },
  urlParams: ["mode"],
  a11y: "full",
  motion: "reduced-variant",
});
