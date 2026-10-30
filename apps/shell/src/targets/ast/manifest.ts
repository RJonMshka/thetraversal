import { CONTRACT_VERSION, type TargetManifest } from "@tv/contract";

// ── AST target manifest (LLD-02 §2) ────────────────────────────────────

export const manifest: TargetManifest = {
  id: "ast",
  label: "AST",
  flag: "--target=ast",
  description: "the portfolio as a syntax tree: lex, parse, eval",
  version: "1.0.0",
  contract: CONTRACT_VERSION,
  ir: ">=1.0.0 <2.0.0",
  entry: { kind: "local", remote: "tv_ast", expose: "./mount", url: "" },
  capabilities: [],
  budget: { jsKbGz: 120 },
  urlParams: ["mode"],
  a11y: "full",
  motion: "reduced-variant",
  isolation: "shadow",
};
