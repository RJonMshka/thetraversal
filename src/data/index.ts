import type { ASTNode, ASTNodeFlat, TokenStreamEntry } from "@/lib/ast-types";
import { PORTFOLIO_AST } from "@/data/ast";
import {
  findNode,
  flatten,
  getTokenStream,
  countNodes,
  getMaxDepth,
  filterByMode,
} from "@/lib/traversal";

// ── Data Access Layer ──────────────────────────────────────────────────
// The single public API for accessing the AST data. All consumers should
// import from "@/data" instead of "@/data/ast" directly. This decouples
// components from the raw constant, enabling caching, content enrichment,
// and data source swapping without touching consumers.

// ── Read-only tree accessor ────────────────────────────────────────────

export function getAST(): ASTNode {
  return PORTFOLIO_AST;
}

// ── Lazy singletons ────────────────────────────────────────────────────
// Computed once on first call, cached for the process lifetime.

let _flatNodes: ASTNodeFlat[] | null = null;

export function getFlatNodes(): ASTNodeFlat[] {
  if (!_flatNodes) _flatNodes = flatten(PORTFOLIO_AST);
  return _flatNodes;
}

let _tokenStream: TokenStreamEntry[] | null = null;

export function getTokens(): TokenStreamEntry[] {
  if (!_tokenStream) _tokenStream = getTokenStream(PORTFOLIO_AST);
  return _tokenStream;
}

let _nodeCount: number | null = null;

export function getNodeCount(): number {
  if (_nodeCount === null) _nodeCount = countNodes(PORTFOLIO_AST);
  return _nodeCount;
}

let _maxDepth: number | null = null;

export function getTreeMaxDepth(): number {
  if (_maxDepth === null) _maxDepth = getMaxDepth(PORTFOLIO_AST);
  return _maxDepth;
}

let _slugDepthMap: ReadonlyMap<string, number> | null = null;

export function getSlugDepthMap(): ReadonlyMap<string, number> {
  if (!_slugDepthMap) {
    _slugDepthMap = new Map(
      getFlatNodes().map((n) => [n.slug, n.depth])
    );
  }
  return _slugDepthMap;
}

// ── Node lookups ───────────────────────────────────────────────────────

export function findNodeBySlug(slug: string) {
  return findNode(PORTFOLIO_AST, slug);
}

// ── Re-exports ─────────────────────────────────────────────────────────

export { filterByMode };
