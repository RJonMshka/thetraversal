import type { ContextWindowEntry, ASTNodeType } from "@/lib/ast-types";
import { flatten } from "@/lib/traversal";
import { PORTFOLIO_AST } from "@/data/ast";

// ── Traversal Summary Generator ────────────────────────────────────────
// Generates a natural-language summary based on which node types the
// visitor has explored. Static logic — fast and predictable.

// Pre-compute slug → depth map from the actual AST.
// This is a module-level constant — computed once, never changes.
const SLUG_DEPTH_MAP: ReadonlyMap<string, number> = new Map(
  flatten(PORTFOLIO_AST).map((n) => [n.slug, n.depth])
);

// Map of node type → discovered-aspect phrase generator.
// Returns null when there's nothing interesting to say for this type.
const TYPE_PHRASE_MAP: Partial<
  Record<ASTNodeType, (labels: string[]) => string | null>
> = {
  FunctionDeclaration: (labels) => `a builder of ${joinLabels(labels)}`,
  ObjectExpression: (labels) => `fluent in ${joinLabels(labels)}`,
  CallExpression: (labels) =>
    `a thinker who contemplates ${joinLabels(labels)}`,
  StringLiteral: (labels) =>
    labels.length > 0 ? `versed in ${joinLabels(labels)}` : null,
  ArrayExpression: (labels) =>
    labels.length > 0 ? `a journeyman through ${joinLabels(labels)}` : null,
  ProgramNode: () => `an identity unfolding`,
  ExportDeclaration: () => `open to connection`,
};

function joinLabels(labels: string[]): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  const last = labels[labels.length - 1];
  const rest = labels.slice(0, -1).join(", ");
  return `${rest}, and ${last}`;
}

// ── generateTraversalSummary ───────────────────────────────────────────
// Returns a sentence describing the visitor's traversal.
// Only fires when >= 8 nodes have been visited.

export function generateTraversalSummary(
  entries: ContextWindowEntry[]
): string | null {
  if (entries.length < 8) return null;

  // Group visited nodes by type, collecting labels per type
  const byType = new Map<ASTNodeType, string[]>();

  for (const entry of entries) {
    // Skip container nodes and root — they aren't interesting for the phrase
    if (
      entry.type === "RootNode" ||
      entry.type === "BlockStatement" ||
      entry.type === "ExpressionStatement" ||
      entry.type === "VariableDeclaration" ||
      entry.type === "ImportDeclaration" ||
      entry.type === "TypeAnnotation"
    ) {
      continue;
    }

    const existing = byType.get(entry.type) ?? [];
    existing.push(entry.label);
    byType.set(entry.type, existing);
  }

  const phrases: string[] = [];

  // Build phrases in priority order (most interesting first)
  const orderedTypes: ASTNodeType[] = [
    "FunctionDeclaration",
    "ObjectExpression",
    "CallExpression",
    "ProgramNode",
    "ExportDeclaration",
    "ArrayExpression",
    "StringLiteral",
  ];

  for (const type of orderedTypes) {
    const labels = byType.get(type);
    if (!labels || labels.length === 0) continue;
    const phraseBuilder = TYPE_PHRASE_MAP[type];
    if (!phraseBuilder) continue;
    const phrase = phraseBuilder(labels);
    if (phrase) phrases.push(phrase);
  }

  if (phrases.length === 0) return null;

  return `You've explored Rajat as: ${phrases.join("; ")}.`;
}

// ── getTraversalDepth ──────────────────────────────────────────────────
// Returns the maximum depth reached by the visitor, using actual AST
// depth data rather than heuristics.

export function getTraversalDepth(entries: ContextWindowEntry[]): number {
  let maxDepth = 0;

  for (const entry of entries) {
    const depth = SLUG_DEPTH_MAP.get(entry.slug) ?? 0;
    maxDepth = Math.max(maxDepth, depth);
  }

  return maxDepth;
}
