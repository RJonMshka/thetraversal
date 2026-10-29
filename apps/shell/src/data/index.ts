import type { Graph } from "@tv/ir";
import { createIRClient } from "@tv/ir/client";
import irGraph from "@tv/ir/dist/graph.json";
import irIndex from "@tv/ir/dist/index.json";
import type { ASTNode, ASTNodeFlat, TokenStreamEntry } from "@/lib/ast-types";
import { toAST } from "@/data/projection";
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
// import from "@/data". Since Phase 2 the tree is a projection of the
// content IR (packages/ir), compiled from content/ at build time.

// The JSON import widens enums to string. The graph was validated against
// the schema by the IR compiler, and the parity test re-checks it, so the
// client bundle does not carry the validator.
const graph = irGraph as unknown as Graph;

// Server components read bodies from disk (lib/content.ts). Client code
// that needs one lazily gets the hashed, immutable URL from index.json.
const bodyPaths: Record<string, string | undefined> = irIndex.bodies;
const ir = createIRClient(graph, {
  bodyUrl: (id) => `/ir/v1/${bodyPaths[id] ?? `body/${id}.json`}`,
});

const PORTFOLIO_AST: ASTNode = toAST(ir);

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
