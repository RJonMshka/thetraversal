import { useMemo } from "react";
import { hierarchy, tree as d3Tree } from "d3-hierarchy";
import type { ASTNode, TraversalMode } from "@/lib/ast-types";
import { NODE_WIDTH, getNodeHeight } from "@/lib/node-dimensions";

// ── Layout Types ──────────────────────────────────────────────────────

export interface LayoutNode {
  id: string;
  slug: string;
  label: string;
  type: ASTNode["type"];
  glowColor: string;
  x: number;
  y: number;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  content?: ASTNode["content"];
  meta?: ASTNode["meta"];
}

export interface LayoutEdge {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourceSlug: string;
  targetSlug: string;
}

export interface ASTLayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  dimensions: { width: number; height: number };
}

// ── Node dimensions ────────────────────────────────────────────────────

const HORIZONTAL_SPACING = 30;
const VERTICAL_SPACING = 90;

// ── Build visible tree ─────────────────────────────────────────────────
// Prunes the AST to only include expanded branches.
// Nodes that aren't expanded don't show their children,
// but we still mark them as having children for the expand indicator.

interface VisibleNode {
  id: string;
  slug: string;
  label: string;
  type: ASTNode["type"];
  glowColor: string;
  hasChildren: boolean;
  isExpanded: boolean;
  content?: ASTNode["content"];
  meta?: ASTNode["meta"];
  children?: VisibleNode[];
}

function buildVisibleTree(
  node: ASTNode,
  expandedNodes: string[]
): VisibleNode {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isExpanded = expandedNodes.includes(node.slug);

  const visibleNode: VisibleNode = {
    id: node.id,
    slug: node.slug,
    label: node.label,
    type: node.type,
    glowColor: node.glowColor,
    hasChildren,
    isExpanded: hasChildren && isExpanded,
    content: node.content,
    meta: node.meta,
  };

  // Only include children if the node is expanded
  if (hasChildren && isExpanded && node.children) {
    visibleNode.children = node.children.map((child) =>
      buildVisibleTree(child, expandedNodes)
    );
  }

  return visibleNode;
}

// ── useASTLayout hook ─────────────────────────────────────────────────
// Computes tree layout positions using d3-hierarchy.
// React renders the SVG — D3 only does math.

export function useASTLayout(
  ast: ASTNode,
  expandedNodes: string[],
  mode: TraversalMode = "parse"
): ASTLayoutResult {
  return useMemo(() => {
    const visibleTree = buildVisibleTree(ast, expandedNodes);

    // Create d3 hierarchy
    const root = hierarchy(visibleTree, (d) => d.children);

    // Compute max node height for this mode to determine vertical spacing
    const maxNodeHeight = Math.max(
      ...root.descendants().map((d) => getNodeHeight(d.data, mode))
    );

    // Count leaves to determine width
    const leafCount = root.leaves().length;
    const treeWidth = Math.max(
      leafCount * (NODE_WIDTH + HORIZONTAL_SPACING),
      NODE_WIDTH * 3
    );
    const treeHeight = (root.height + 1) * (maxNodeHeight + VERTICAL_SPACING);

    // Compute tree layout — d3.tree() gives us x, y coords
    const treeLayout = d3Tree<VisibleNode>()
      .size([treeWidth, treeHeight])
      .separation((a, b) => {
        // Tighter spacing — keeps the tree compact
        return a.parent === b.parent ? 1 : 1.2;
      });

    treeLayout(root);

    // Extract nodes
    const nodes: LayoutNode[] = root.descendants().map((d) => ({
      id: d.data.id,
      slug: d.data.slug,
      label: d.data.label,
      type: d.data.type,
      glowColor: d.data.glowColor,
      x: d.x ?? 0,
      y: d.y ?? 0,
      depth: d.depth,
      hasChildren: d.data.hasChildren,
      isExpanded: d.data.isExpanded,
      content: d.data.content,
      meta: d.data.meta,
    }));

    // Extract edges
    const edges: LayoutEdge[] = root.links().map((link) => ({
      id: `${link.source.data.slug}-${link.target.data.slug}`,
      sourceX: link.source.x ?? 0,
      sourceY: link.source.y ?? 0,
      targetX: link.target.x ?? 0,
      targetY: link.target.y ?? 0,
      sourceSlug: link.source.data.slug,
      targetSlug: link.target.data.slug,
    }));

    // Add padding around the tree
    const padding = 80;
    const dimensions = {
      width: treeWidth + padding * 2,
      height: treeHeight + padding * 2,
    };

    // Offset all positions by padding
    for (const node of nodes) {
      node.x += padding;
      node.y += padding;
    }
    for (const edge of edges) {
      edge.sourceX += padding;
      edge.sourceY += padding;
      edge.targetX += padding;
      edge.targetY += padding;
    }

    return { nodes, edges, dimensions };
  }, [ast, expandedNodes, mode]);
}
