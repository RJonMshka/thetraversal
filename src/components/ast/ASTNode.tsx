"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import type { LayoutNode } from "@/hooks/useASTLayout";
import type { TraversalMode } from "@/lib/ast-types";
import {
  NODE_WIDTH,
  HEADER_SECTION_HEIGHT,
} from "@/lib/node-dimensions";

// ── Props ──────────────────────────────────────────────────────────────

interface ASTNodeProps {
  node: LayoutNode;
  isVisited: boolean;
  isFocused: boolean;
  isOverflowing?: boolean;
  mode: TraversalMode;
  onNodeClick: (slug: string) => void;
  onNodeNavigate: (slug: string) => void;
  onNodeHover: (slug: string | null) => void;
  onNodeFocus?: (slug: string) => void;
}

// ── Constants ──────────────────────────────────────────────────────────

const BORDER_RADIUS = 4;

const TYPE_ABBREV: Record<string, string> = {
  RootNode: "ROOT",
  ProgramNode: "PROG",
  BlockStatement: "BLOCK",
  FunctionDeclaration: "FN",
  ObjectExpression: "OBJ",
  ExpressionStatement: "EXPR",
  CallExpression: "CALL",
  VariableDeclaration: "VAR",
  ArrayExpression: "ARR",
  ExportDeclaration: "EXPORT",
  StringLiteral: "STR",
  ImportDeclaration: "IMPORT",
  TypeAnnotation: "TYPE",
};

// ── Glow color resolver ────────────────────────────────────────────────

const GLOW_COLORS: Record<string, string> = {
  "--ctp-text": "#cdd6f4",
  "--ctp-yellow": "#f9e2af",
  "--ctp-peach": "#fab387",
  "--ctp-mauve": "#cba6f7",
  "--ctp-teal": "#94e2d5",
  "--ctp-lavender": "#b4befe",
  "--ctp-green": "#a6e3a1",
  "--ctp-red": "#f38ba8",
  "--ctp-blue": "#89b4fa",
  "--ctp-sky": "#89dceb",
  "--ctp-pink": "#f5c2e7",
  "--ctp-rosewater": "#f5e0dc",
  "--ctp-flamingo": "#f2cdcd",
  "--ctp-maroon": "#eba0ac",
  "--ctp-sapphire": "#74c7ec",
};

function resolveGlowColor(glowColor: string): string {
  return GLOW_COLORS[glowColor] ?? "#cdd6f4";
}

// ── Component ──────────────────────────────────────────────────────────

export function ASTNode({
  node,
  isVisited,
  isFocused,
  isOverflowing = false,
  mode: _mode,
  onNodeClick,
  onNodeNavigate,
  onNodeHover,
  onNodeFocus,
}: ASTNodeProps) {
  const isLeaf = !node.hasChildren;
  const isRoot = node.depth === 0;
  const glowHex = resolveGlowColor(node.glowColor);
  const typeAbbrev = TYPE_ABBREV[node.type] ?? node.type;
  const filterId = `glow-${node.slug}`;

  const headerTop = -HEADER_SECTION_HEIGHT / 2;

  // ── Click handler ──────────────────────────────────────────────────
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      if (isLeaf) {
        onNodeNavigate(node.slug);
      } else {
        onNodeClick(node.slug);
      }
    },
    [isLeaf, node.slug, onNodeClick, onNodeNavigate]
  );

  const displayLabel =
    node.label.length > 16 ? node.label.slice(0, 15) + "…" : node.label;

  // Stack overflow easter egg
  const overflowHash = node.slug
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const overflowX = isOverflowing ? Math.sin(overflowHash) * 80 : 0;
  const overflowY = isOverflowing ? 300 + (overflowHash % 200) : 0;
  const overflowRotate = isOverflowing
    ? Math.sin(overflowHash * 0.7) * 30
    : 0;

  const positionTransition = {
    type: "spring" as const,
    stiffness: 170,
    damping: 28,
    mass: 1,
    restDelta: 0.01,
    restSpeed: 0.01,
  };

  const headerStroke = isFocused
    ? "var(--accent)"
    : isRoot
    ? "var(--line-strong)"
    : "var(--line-2)";

  return (
    <motion.g
      data-node-slug={node.slug}
      initial={{ opacity: 0, x: node.x, y: node.y, rotate: 0 }}
      animate={{
        opacity: isOverflowing ? 0.6 : 1,
        x: node.x + overflowX,
        y: node.y + overflowY,
        rotate: overflowRotate,
      }}
      exit={{ opacity: 0 }}
      transition={{
        opacity: { duration: 0.25, ease: "easeOut" },
        x: isOverflowing
          ? { type: "spring", stiffness: 60, damping: 12 }
          : positionTransition,
        y: isOverflowing
          ? { type: "spring", stiffness: 60, damping: 12 }
          : positionTransition,
        rotate: { type: "spring", stiffness: 60, damping: 12 },
      }}
      style={{ cursor: "pointer", outline: "none" }}
      role="treeitem"
      aria-expanded={node.hasChildren ? node.isExpanded : undefined}
      aria-label={`${node.type}: ${node.label}${isVisited ? ", visited" : ""}${isLeaf ? ". Click to open" : ". Click to expand"}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          e.stopPropagation();
          onNodeNavigate(node.slug);
          return;
        }
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (isLeaf) {
            onNodeNavigate(node.slug);
          } else {
            onNodeClick(node.slug);
          }
        }
      }}
      onClick={handleClick}
      onMouseLeave={(e) => {
        onNodeHover(null);
        e.stopPropagation();
      }}
      onMouseEnter={() => onNodeHover(node.slug)}
      onFocus={() => {
        onNodeHover(node.slug);
        onNodeFocus?.(node.slug);
      }}
      onBlur={() => onNodeHover(null)}
    >
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation={isFocused ? "5" : "1.5"}
            floodColor={glowHex}
            floodOpacity={isFocused ? "0.45" : "0.06"}
          />
        </filter>
      </defs>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <rect
        x={-NODE_WIDTH / 2}
        y={headerTop}
        width={NODE_WIDTH}
        height={HEADER_SECTION_HEIGHT}
        rx={BORDER_RADIUS}
        ry={BORDER_RADIUS}
        fill="var(--ink-2)"
        stroke={headerStroke}
        strokeWidth={isFocused ? 1.5 : 1}
        filter={`url(#${filterId})`}
      />

      {/* Type badge */}
      <text
        x={-NODE_WIDTH / 2 + 10}
        y={headerTop + 18}
        fill="var(--text-faint)"
        fontSize="9"
        fontFamily="var(--font-mono)"
        letterSpacing="0.1em"
        dominantBaseline="middle"
      >
        {typeAbbrev}
      </text>

      {/* Node label */}
      <text
        x={-NODE_WIDTH / 2 + 10}
        y={headerTop + 38}
        fill={isFocused ? "var(--accent)" : "var(--tv-text)"}
        fontSize="13"
        fontFamily="var(--font-mono)"
        fontWeight="500"
        dominantBaseline="middle"
      >
        {displayLabel}
      </text>

      {/* Visited dot */}
      {isVisited && (
        <circle
          cx={NODE_WIDTH / 2 - 14}
          cy={headerTop + 14}
          r="3.5"
          fill="var(--accent)"
          opacity="0.55"
        />
      )}

      {/* Expand/collapse indicator */}
      {node.hasChildren && (
        <text
          x={NODE_WIDTH / 2 - 16}
          y={headerTop + 38}
          fill="var(--text-faint)"
          fontSize="13"
          fontFamily="var(--font-mono)"
          dominantBaseline="middle"
          textAnchor="middle"
        >
          {node.isExpanded ? "−" : "+"}
        </text>
      )}

      {/* Navigation arrow for leaf nodes */}
      {isLeaf && (
        <text
          x={NODE_WIDTH / 2 - 16}
          y={headerTop + 38}
          fill={isFocused ? "var(--accent)" : "var(--text-faint)"}
          fontSize="13"
          fontFamily="var(--font-mono)"
          dominantBaseline="middle"
          textAnchor="middle"
          opacity={isFocused ? 1 : 0.6}
        >
          {"›"}
        </text>
      )}
    </motion.g>
  );
}
