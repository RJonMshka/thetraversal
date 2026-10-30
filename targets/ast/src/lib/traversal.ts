import type {
  ASTNode,
  ASTNodeFlat,
  ASTPath,
  FindNodeResult,
  TokenStreamEntry,
  TraversalMode,
} from "@/lib/ast-types";

// ── findNode ───────────────────────────────────────────────────────────
// DFS search returning the node and the path (breadcrumb trail) to it.
// Returns null if the slug doesn't exist in the tree.

export function findNode(
  tree: ASTNode,
  slug: string
): FindNodeResult | null {
  function dfs(
    node: ASTNode,
    path: ASTPath
  ): FindNodeResult | null {
    const currentPath: ASTPath = [
      ...path,
      { id: node.id, label: node.label, slug: node.slug },
    ];

    if (node.slug === slug) {
      return { node, path: currentPath };
    }

    if (node.children) {
      for (const child of node.children) {
        const result = dfs(child, currentPath);
        if (result) return result;
      }
    }

    return null;
  }

  return dfs(tree, []);
}

// ── getChildren ────────────────────────────────────────────────────────
// Returns the immediate children of a node identified by slug.
// Returns an empty array if the node has no children or doesn't exist.

export function getChildren(tree: ASTNode, slug: string): ASTNode[] {
  const result = findNode(tree, slug);
  if (!result) return [];
  return result.node.children ?? [];
}

// ── flatten ────────────────────────────────────────────────────────────
// Produces a flat array of all nodes for search, filter, and iteration.
// Each entry includes depth and parentId for reconstruction.

export function flatten(tree: ASTNode): ASTNodeFlat[] {
  const result: ASTNodeFlat[] = [];

  function walk(
    node: ASTNode,
    depth: number,
    parentId: string | null
  ): void {
    result.push({
      id: node.id,
      type: node.type,
      label: node.label,
      slug: node.slug,
      glowColor: node.glowColor,
      depth,
      parentId,
      content: node.content,
      meta: node.meta,
    });

    if (node.children) {
      for (const child of node.children) {
        walk(child, depth + 1, node.id);
      }
    }
  }

  walk(tree, 0, null);
  return result;
}

// ── getTokenStream ─────────────────────────────────────────────────────
// Produces the linear career token sequence for the bottom bar.
// Extracts key milestones from the timeline and connects them with
// operator tokens.

export function getTokenStream(tree: ASTNode): TokenStreamEntry[] {
  const tokens: TokenStreamEntry[] = [];
  const timelineResult = findNode(tree, "timeline-entries");

  if (!timelineResult?.node.children) return tokens;

  const entries = timelineResult.node.children;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    if (i > 0) {
      tokens.push({ type: "OP", value: "\u2192" }); // →
    }

    tokens.push({
      type: "IDENT",
      value: entry.label,
      slug: entry.slug,
    });
  }

  return tokens;
}

// ── filterByMode ───────────────────────────────────────────────────────
// Strips content fields based on traversal mode.
// - lex: labels and types only (no content)
// - parse: labels + summaries + structure
// - eval: full content, everything visible

export function filterByMode(
  node: ASTNode,
  mode: TraversalMode
): ASTNode {
  const filtered = { ...node };

  switch (mode) {
    case "lex":
      // Strip all content — labels and types only
      filtered.content = undefined;
      break;

    case "parse":
      // Keep summary, strip body and deep
      if (filtered.content) {
        filtered.content = {
          summary: filtered.content.summary,
          body: "",
          deep: null,
        };
      }
      break;

    case "eval":
      // Full content — no stripping
      break;
  }

  // Recursively filter children
  if (filtered.children) {
    filtered.children = filtered.children.map((child) =>
      filterByMode(child, mode)
    );
  }

  return filtered;
}

// ── countNodes ──────────────────────────────────────────────────────────
// Counts total nodes in the tree (useful for context window stats).

export function countNodes(tree: ASTNode): number {
  let count = 1;
  if (tree.children) {
    for (const child of tree.children) {
      count += countNodes(child);
    }
  }
  return count;
}

// ── getMaxDepth ────────────────────────────────────────────────────────
// Returns the maximum depth of the tree.

export function getMaxDepth(tree: ASTNode): number {
  if (!tree.children || tree.children.length === 0) return 0;
  return 1 + Math.max(...tree.children.map(getMaxDepth));
}
