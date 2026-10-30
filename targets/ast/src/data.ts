"use client";

import { createContext, useContext } from "react";
import type { IRClient } from "@tv/ir";
import type { ASTNode, ASTNodeFlat, FindNodeResult, TokenStreamEntry } from "@/targets/ast/lib/ast-types";
import { findNode, flatten, getTokenStream } from "@/targets/ast/lib/traversal";
import { toAST } from "@/targets/ast/projection";

// ── AST data ───────────────────────────────────────────────────────────
// The tree the AST renders, projected from ctx.ir once per mount.

export interface AstData {
  ast: ASTNode;
  flat: ASTNodeFlat[];
  tokens: TokenStreamEntry[];
  find(slug: string): FindNodeResult | null;
}

export function createAstData(ir: IRClient): AstData {
  const ast = toAST(ir);
  return {
    ast,
    flat: flatten(ast),
    tokens: getTokenStream(ast),
    find: (slug) => findNode(ast, slug),
  };
}

const AstDataContext = createContext<AstData | null>(null);

export const AstDataProvider = AstDataContext.Provider;

export function useAstData(): AstData {
  const data = useContext(AstDataContext);
  if (!data) throw new Error("useAstData must be used inside <AstDataProvider>");
  return data;
}
