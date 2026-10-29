import { describe, expect, it } from "vitest";
import { Graph, createIRClient } from "@tv/ir";
import graph from "@tv/ir/dist/graph.json";
import { PORTFOLIO_AST as LEGACY } from "@/data/legacy/ast";
import { toAST } from "@/data/projection";
import { getAST } from "@/data";

// ── Golden test (LLD-01 §8) ────────────────────────────────────────────
// The IR, projected to an AST, must equal the hand-written legacy tree.
// Strict equality: excerpts project to content.body, so inline bodies are
// compared too. Fix mismatches in the projection tables, never by id.

describe("IR parity", () => {
  it("the shipped graph satisfies the IR schema", () => {
    expect(() => Graph.parse(graph)).not.toThrow();
  });

  it("IR projected to AST equals the legacy tree", () => {
    const projected = toAST(createIRClient(Graph.parse(graph), { bodyUrl: () => "" }));
    expect(projected).toStrictEqual(LEGACY);
  });

  it("the @/data facade serves the projected tree", () => {
    expect(getAST()).toStrictEqual(LEGACY);
  });
});
