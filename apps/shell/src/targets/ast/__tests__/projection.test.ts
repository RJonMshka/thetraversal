import { describe, expect, it } from "vitest";
import { Graph, createIRClient } from "@tv/ir";
import graph from "@tv/ir/dist/graph.json";
import type { ASTNode } from "@/targets/ast/lib/ast-types";
import { toAST } from "@/targets/ast/projection";
import { getAST } from "@/data";

// ── IR projection invariants (LLD-01 §8) ───────────────────────────────
// Phase 2's golden test compared this projection with the hand-written
// legacy tree and passed with strict equality (commit 41286ae) before the
// legacy registries were deleted. These checks keep the projection
// faithful to the graph from here on.

const ir = createIRClient(Graph.parse(graph), { bodyUrl: () => "" });
const ast = toAST(ir);

function flatten(node: ASTNode): ASTNode[] {
  return [node, ...(node.children ?? []).flatMap(flatten)];
}
const nodes = flatten(ast);

describe("IR projection", () => {
  it("the shipped graph satisfies the IR schema", () => {
    expect(() => Graph.parse(graph)).not.toThrow();
  });

  it("projects every entity exactly once, with slug equal to id", () => {
    const ids = nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(Object.keys(ir.graph.entities).sort());
    for (const n of nodes) expect(n.slug).toBe(n.id);
  });

  it("keeps contains order and entity fields", () => {
    for (const n of nodes) {
      const entity = ir.entity(n.id);
      expect(entity).toBeDefined();
      if (!entity) continue;
      expect((n.children ?? []).map((c) => c.id)).toEqual(ir.children(n.id).map((c) => c.id));
      expect(n.label).toBe(entity.label);
      expect(n.content?.summary).toBe(entity.summary);
      expect(n.content?.body).toBe(entity.excerpt ?? "");
    }
  });

  it("glows with a theme token, and sections glow like their first child", () => {
    for (const n of nodes) {
      expect(n.glowColor).toMatch(/^--ctp-[a-z]+$/);
      if (n.type === "BlockStatement" && n.children?.[0]) {
        expect(n.glowColor).toBe(n.children[0].glowColor);
      }
    }
  });

  it("the @/data facade serves the projected tree", () => {
    expect(getAST()).toStrictEqual(ast);
  });
});
