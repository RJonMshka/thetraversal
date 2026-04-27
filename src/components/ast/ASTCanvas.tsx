"use client";

import { useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { zoom as d3Zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { select } from "d3-selection";
import "d3-transition"; // Augments d3-selection with .transition()
import { AnimatePresence } from "framer-motion";
import { useASTLayout } from "@/hooks/useASTLayout";
import { useTraversalState } from "@/hooks/useTraversalState";
import { useStackOverflow } from "@/hooks/useStackOverflow";
import { getAST } from "@/data";
import { ASTNode } from "@/components/ast/ASTNode";
import { ASTEdge } from "@/components/ast/ASTEdge";
import type { TraversalMode, ASTNode as ASTNodeType } from "@/lib/ast-types";

// ── Props ──────────────────────────────────────────────────────────────

interface ASTCanvasProps {
  mode: TraversalMode;
  onNodeSelect?: (slug: string | null) => void;
}

// ── Tree navigation helpers ────────────────────────────────────────────
// Used by arrow key navigation to find parent, children, and siblings
// within the visible tree.

function findParentSlug(
  ast: ASTNodeType,
  targetSlug: string,
  expandedNodes: string[]
): string | null {
  function search(
    node: ASTNodeType,
    parentSlug: string | null
  ): string | null {
    if (node.slug === targetSlug) return parentSlug;
    if (!node.children || !expandedNodes.includes(node.slug)) return null;
    for (const child of node.children) {
      const result = search(child, node.slug);
      if (result !== null) return result;
    }
    return null;
  }
  return search(ast, null);
}

function findSiblings(
  ast: ASTNodeType,
  targetSlug: string,
  expandedNodes: string[]
): string[] {
  function search(node: ASTNodeType): string[] | null {
    if (node.children && expandedNodes.includes(node.slug)) {
      const childSlugs = node.children.map((c) => c.slug);
      if (childSlugs.includes(targetSlug)) return childSlugs;
      for (const child of node.children) {
        const result = search(child);
        if (result) return result;
      }
    }
    return null;
  }
  // Root is a special case — it has no parent, so siblings is just [root]
  if (ast.slug === targetSlug) return [ast.slug];
  return search(ast) ?? [targetSlug];
}

function findFirstChildSlug(
  ast: ASTNodeType,
  targetSlug: string,
  expandedNodes: string[]
): string | null {
  function search(node: ASTNodeType): string | null {
    if (node.slug === targetSlug) {
      if (
        node.children &&
        node.children.length > 0 &&
        expandedNodes.includes(node.slug)
      ) {
        return node.children[0].slug;
      }
      return null;
    }
    if (!node.children || !expandedNodes.includes(node.slug)) return null;
    for (const child of node.children) {
      const result = search(child);
      if (result !== null) return result;
    }
    return null;
  }
  return search(ast);
}

// ── Component ──────────────────────────────────────────────────────────
// The main SVG canvas for the AST visualization.
// D3 handles zoom/pan math. React renders all SVG elements.
//
// Philosophy: The viewport is the visitor's eye. It should never move
// unless the visitor moves it. When a node is expanded/collapsed, the
// tree reshapes around the clicked node — the clicked node stays pinned
// at its screen position. The visitor's zoom level is sacred; we never
// change it programmatically.

export function ASTCanvas({ mode, onNodeSelect }: ASTCanvasProps) {
  const ast = getAST();
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [focusedNodeSlug, setFocusedNodeSlug] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [hasInitialized, setHasInitialized] = useState(false);


  // ── Refs for stable access without stale closures ────────────────────
  // transformRef always holds the latest transform value, accessible from
  // callbacks and effects without adding transform to dependency arrays.
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // Snapshot of where the clicked node was *before* layout recalculation.
  // Stored as a ref because it's imperative state that bridges two events
  // (the click and the subsequent layout recalc).
  const pendingAnchorRef = useRef<{
    slug: string;
    oldX: number;
    oldY: number;
  } | null>(null);

  // Zustand state — gate persisted values behind hasHydrated to prevent
  // SSR hydration mismatches. Before hydration, use empty defaults.
  const hasHydrated = useTraversalState((s) => s.hasHydrated);
  const rawExpandedNodes = useTraversalState((s) => s.expandedNodes);
  const visitNode = useTraversalState((s) => s.visitNode);
  const toggleExpand = useTraversalState((s) => s.toggleExpand);
  const rawIsVisited = useTraversalState((s) => s.isVisited);

  // Before hydration, render with empty state (matches SSR output)
  const expandedNodes = hasHydrated ? rawExpandedNodes : [];
  const isVisited = hasHydrated
    ? rawIsVisited
    : () => false;

  // Stack overflow easter egg — 7 rapid clicks on root node
  // (Raised from 5 to 7 so casual expand/collapse clicking doesn't trigger it)
  const { isOverflowing, registerClick: registerOverflowClick } =
    useStackOverflow("root", 7, 2000);

  // Compute layout — mode affects node heights, which affects spacing
  const { nodes, edges, dimensions } = useASTLayout(
    ast,
    expandedNodes,
    mode
  );

  // ── Smooth pan to center a node (for explicit navigation) ────────────
  // Used by external navigation (e.g. clicking a token in the stream).
  // NOT used for expand/collapse — those use viewport stabilization instead.
  const panToNode = useCallback(
    (slug: string) => {
      const svg = svgRef.current;
      const zoomBehavior = zoomRef.current;
      if (!svg || !zoomBehavior) return;

      const target = nodes.find((n) => n.slug === slug);
      if (!target) return;

      const svgRect = svg.getBoundingClientRect();
      const t = transformRef.current;

      // Preserve the user's zoom level exactly — never change scale
      const scale = t.k;

      // Compute translation to center the target node in the viewport
      const translateX = svgRect.width / 2 - target.x * scale;
      const translateY = svgRect.height / 2 - target.y * scale;

      const selection = select(svg);
      selection
        .transition()
        .duration(400)
        .ease((t: number) => 1 - Math.pow(1 - t, 3)) // ease-out cubic
        .call(
          zoomBehavior.transform,
          zoomIdentity.translate(translateX, translateY).scale(scale)
        );
    },
    [nodes]
  );

  // ── Handle node click ────────────────────────────────────────────────
  // Captures the node's current tree-space position BEFORE toggling
  // expand, so we can stabilize the viewport after layout recalculates.
  const handleNodeClick = useCallback(
    (slug: string) => {
      const node = nodes.find((n) => n.slug === slug);
      if (!node) return;

      // Track rapid root clicks for easter egg
      registerOverflowClick(slug);

      // Snapshot the node's position before layout changes
      pendingAnchorRef.current = {
        slug,
        oldX: node.x,
        oldY: node.y,
      };

      toggleExpand(slug);
      visitNode(slug, node.label, node.type, node.glowColor);
      onNodeSelect?.(slug);
    },
    [nodes, toggleExpand, visitNode, registerOverflowClick, onNodeSelect]
  );

  // ── Handle node navigation (double-click or leaf click) ───────────────
  // Navigates to the node's detail page at /node/[slug].
  // For leaf nodes this is triggered by single click; for parent nodes
  // by double-click or Ctrl+Enter.
  const handleNodeNavigate = useCallback(
    (slug: string) => {
      const node = nodes.find((n) => n.slug === slug);
      if (node) {
        visitNode(slug, node.label, node.type, node.glowColor);
      }
      router.push(`/node/${slug}`);
    },
    [nodes, visitNode, router]
  );

  // Handle node hover
  const handleNodeHover = useCallback((slug: string | null) => {
    setHoveredNode(slug);
  }, []);

  // ── Arrow key navigation ────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!focusedNodeSlug) return;

      let nextSlug: string | null = null;

      switch (e.key) {
        case "ArrowUp": {
          // Move to parent
          e.preventDefault();
          nextSlug = findParentSlug(ast, focusedNodeSlug, expandedNodes);
          break;
        }
        case "ArrowDown": {
          // Move to first child (if expanded)
          e.preventDefault();
          nextSlug = findFirstChildSlug(ast, focusedNodeSlug, expandedNodes);
          break;
        }
        case "ArrowLeft":
        case "ArrowRight": {
          // Move between siblings
          e.preventDefault();
          const siblings = findSiblings(ast, focusedNodeSlug, expandedNodes);
          const currentIndex = siblings.indexOf(focusedNodeSlug);
          if (currentIndex === -1) break;
          const direction = e.key === "ArrowLeft" ? -1 : 1;
          const nextIndex = currentIndex + direction;
          if (nextIndex >= 0 && nextIndex < siblings.length) {
            nextSlug = siblings[nextIndex];
          }
          break;
        }
      }

      if (nextSlug) {
        setFocusedNodeSlug(nextSlug);
        setHoveredNode(nextSlug);
        // Focus the corresponding SVG element
        const svg = svgRef.current;
        if (svg) {
          const nodeEl = svg.querySelector(
            `[data-node-slug="${nextSlug}"]`
          ) as HTMLElement | null;
          nodeEl?.focus();
        }
      }
    },
    [ast, focusedNodeSlug, expandedNodes]
  );

  // Track focused node from ASTNode focus events
  const handleNodeFocus = useCallback((slug: string) => {
    setFocusedNodeSlug(slug);
    setHoveredNode(slug);
  }, []);

  // ── Set up D3 zoom behavior (once) ──────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      // Don't start a pan/drag when clicking on interactive node elements.
      // Without this, D3 captures mousedown on nodes and can swallow clicks.
      .filter((event: Event) => {
        // Allow wheel events (zoom) unconditionally
        if (event.type === "wheel") return true;
        // Block drag-start if the click target is inside a [role="treeitem"]
        const target = event.target as Element;
        if (target.closest?.('[role="treeitem"]')) return false;
        return true;
      })
      .on("zoom", (event) => {
        const { x, y, k } = event.transform;
        setTransform({ x, y, k });
      });

    zoomRef.current = zoomBehavior;
    const selection = select(svg);
    selection.call(zoomBehavior);

    return () => {
      selection.on(".zoom", null);
    };
  }, []);



  // ── Initial zoom-to-fit ──────────────────────────────────────────────
  // Wait for both: nodes to exist AND Zustand hydration to complete.
  // This ensures we fit the tree with the correct expanded state from
  // sessionStorage, not the empty default state from SSR.
  useEffect(() => {
    if (hasInitialized || nodes.length === 0 || !hasHydrated) return;

    const svg = svgRef.current;
    const zoomBehavior = zoomRef.current;
    if (!svg || !zoomBehavior) return;

    const svgRect = svg.getBoundingClientRect();
    const scaleX = svgRect.width / dimensions.width;
    const scaleY = svgRect.height / dimensions.height;
    const scale = Math.min(scaleX, scaleY, 1) * 0.85;

    const translateX = (svgRect.width - dimensions.width * scale) / 2;
    const translateY = (svgRect.height - dimensions.height * scale) / 2;

    const selection = select(svg);
    selection.call(
      zoomBehavior.transform,
      zoomIdentity.translate(translateX, translateY).scale(scale)
    );

    setHasInitialized(true);
  }, [dimensions, nodes.length, hasInitialized, hasHydrated]);

  // ── Stabilize viewport after expand/collapse ─────────────────────────
  // When a node is expanded/collapsed, D3 recalculates the entire tree
  // layout — every node coordinate may shift. This effect computes how
  // much the *clicked* node moved in tree-space and applies a compensating
  // viewport translation so it stays pinned at the same screen position.
  //
  // The key trick: we read the current transform from transformRef (a ref,
  // not state) to avoid circular dependencies. This effect only runs when
  // `nodes` changes (i.e., after layout recalculation), and only does
  // anything if pendingAnchorRef was set by a click.
  //
  // We use useLayoutEffect (imported above) so the compensation happens
  // synchronously before the browser paints. This prevents the single-frame
  // glitch where the old viewport is painted before the new one kicks in.
  useLayoutEffect(() => {
    const anchor = pendingAnchorRef.current;
    if (!anchor) return;

    const svg = svgRef.current;
    const zoomBehavior = zoomRef.current;
    if (!svg || !zoomBehavior) return;

    const newNode = nodes.find((n) => n.slug === anchor.slug);
    if (!newNode) {
      pendingAnchorRef.current = null;
      return;
    }

    // How much did the clicked node move in tree-space?
    const deltaX = newNode.x - anchor.oldX;
    const deltaY = newNode.y - anchor.oldY;

    // Clear the anchor immediately so this doesn't re-fire
    pendingAnchorRef.current = null;

    // If the node didn't move, no viewport adjustment needed
    if (Math.abs(deltaX) < 0.1 && Math.abs(deltaY) < 0.1) return;

    // Read current transform from the ref (always fresh, no stale closure)
    const t = transformRef.current;

    // Compensate: shift viewport by the delta (converted to screen-space)
    // If the node moved +100px right in tree-space and we're at 0.5x zoom,
    // we need to shift the viewport -50px left to keep it pinned.
    const newTranslateX = t.x - deltaX * t.k;
    const newTranslateY = t.y - deltaY * t.k;

    // Apply INSTANTLY — no transition. Nodes animate their own positions
    // via Framer Motion springs, so the viewport must jump immediately to
    // keep the clicked node pinned.
    const selection = select(svg);
    selection.call(
      zoomBehavior.transform,
      zoomIdentity.translate(newTranslateX, newTranslateY).scale(t.k)
    );
  }, [nodes]);

  // Find which edges lead to the hovered node (highlight full path to root)
  const highlightedEdges = new Set<string>();
  if (hoveredNode) {
    let currentSlug: string | null = hoveredNode;
    while (currentSlug) {
      const edge = edges.find((e) => e.targetSlug === currentSlug);
      if (edge) {
        highlightedEdges.add(edge.id);
        currentSlug = edge.sourceSlug;
      } else {
        currentSlug = null;
      }
    }
  }

  // Don't render tree content until hydration completes to prevent
  // flash of incorrect state (e.g. showing Identity node briefly
  // before sessionStorage expanded state kicks in).
  const showTree = hasHydrated;

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const target = e.target as Element;
      if (!target.closest?.('[role="treeitem"]')) {
        onNodeSelect?.(null);
      }
    },
    [onNodeSelect]
  );

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      role="tree"
      aria-label="AST Visualization"
      style={{ touchAction: "none" }}
      onKeyDown={handleKeyDown}
      onClick={handleSvgClick}
    >
      {showTree && (
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {/* Render edges first (below nodes) */}
          <AnimatePresence mode="sync">
            {edges.map((edge) => (
              <ASTEdge
                key={edge.id}
                edge={edge}
                isHighlighted={highlightedEdges.has(edge.id)}
              />
            ))}
          </AnimatePresence>

          {/* Render nodes */}
          <AnimatePresence mode="sync">
            {nodes.map((node) => (
              <ASTNode
                key={node.slug}
                node={node}
                isVisited={isVisited(node.slug)}
                isFocused={hoveredNode === node.slug}
                isOverflowing={isOverflowing}
                mode={mode}
                onNodeClick={handleNodeClick}
                onNodeNavigate={handleNodeNavigate}
                onNodeHover={handleNodeHover}
                onNodeFocus={handleNodeFocus}
              />
            ))}
          </AnimatePresence>
        </g>
      )}

      {/* Zoom controls hint */}
      <foreignObject
        x="0"
        y="0"
        width="100%"
        height="100%"
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "16px",
            color: "var(--text-faint)",
            fontSize: "10px",
            fontFamily: "var(--font-mono)",
            opacity: 0.5,
          }}
        >
          scroll to zoom · drag to pan · click to expand · hold to open
        </div>
      </foreignObject>
    </svg>
  );
}
