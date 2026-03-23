"use client";

import { motion } from "framer-motion";
import type { LayoutNode } from "@/hooks/useASTLayout";
import type { TraversalMode } from "@/lib/ast-types";

// ── Props ──────────────────────────────────────────────────────────────

interface ASTNodeProps {
  node: LayoutNode;
  isVisited: boolean;
  isFocused: boolean;
  mode: TraversalMode;
  onNodeClick: (slug: string) => void;
  onNodeHover: (slug: string | null) => void;
}

// ── Constants ──────────────────────────────────────────────────────────

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const BORDER_RADIUS = 8;

// Short type abbreviations for the type badge
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
// Maps CSS custom property names to actual hex values for SVG filters.
// SVG filters can't use CSS variables, so we resolve them here.

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
  mode,
  onNodeClick,
  onNodeHover,
}: ASTNodeProps) {
  const glowHex = resolveGlowColor(node.glowColor);
  const typeAbbrev = TYPE_ABBREV[node.type] ?? node.type;
  const filterId = `glow-${node.slug}`;

  // Truncate label if too long
  const displayLabel =
    node.label.length > 16 ? node.label.slice(0, 15) + "\u2026" : node.label;

  // Spring config tuned for organic tree reshaping — fast response,
  // minimal overshoot, settles quickly. Feels alive, not mechanical.
  const positionTransition = {
    type: "spring" as const,
    stiffness: 170,
    damping: 26,
    mass: 1,
  };

  return (
    <motion.g
      initial={{ opacity: 0, x: node.x, y: node.y }}
      animate={{ opacity: 1, x: node.x, y: node.y }}
      exit={{ opacity: 0 }}
      transition={{
        opacity: { duration: 0.25, ease: "easeOut" },
        x: positionTransition,
        y: positionTransition,
      }}
      style={{ cursor: "pointer", outline: "none" }}
      role="treeitem"
      aria-expanded={node.hasChildren ? node.isExpanded : undefined}
      aria-label={`${node.type}: ${node.label}${isVisited ? ", visited" : ""}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNodeClick(node.slug);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        onNodeClick(node.slug);
      }}
      onMouseEnter={() => onNodeHover(node.slug)}
      onMouseLeave={() => onNodeHover(null)}
      onFocus={() => onNodeHover(node.slug)}
      onBlur={() => onNodeHover(null)}
    >
      {/* Glow filter definition */}
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation={isFocused ? "6" : "3"}
            floodColor={glowHex}
            floodOpacity={isFocused ? "0.5" : isVisited ? "0.1" : "0.25"}
          />
        </filter>
      </defs>

      {/* Node background rect — coordinates relative to motion.g origin */}
      <rect
        x={-NODE_WIDTH / 2}
        y={-NODE_HEIGHT / 2}
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={BORDER_RADIUS}
        ry={BORDER_RADIUS}
        fill="var(--color-ctp-surface0)"
        stroke={glowHex}
        strokeWidth={isFocused ? 1.5 : 1}
        strokeOpacity={isFocused ? 0.9 : isVisited ? 0.3 : 0.5}
        filter={`url(#${filterId})`}
      />

      {/* Type badge */}
      <text
        x={-NODE_WIDTH / 2 + 10}
        y={-NODE_HEIGHT / 2 + 18}
        fill="var(--color-ctp-overlay0)"
        fontSize="9"
        fontFamily="var(--font-mono)"
        dominantBaseline="middle"
      >
        {typeAbbrev}
      </text>

      {/* Node label */}
      <text
        x={-NODE_WIDTH / 2 + 10}
        y={-NODE_HEIGHT / 2 + 38}
        fill={glowHex}
        fontSize="13"
        fontFamily="var(--font-mono)"
        fontWeight="600"
        dominantBaseline="middle"
      >
        {displayLabel}
      </text>

      {/* Visited indicator */}
      {isVisited && (
        <circle
          cx={NODE_WIDTH / 2 - 14}
          cy={-NODE_HEIGHT / 2 + 14}
          r="4"
          fill={glowHex}
          opacity="0.6"
        />
      )}

      {/* Expand/collapse indicator */}
      {node.hasChildren && (
        <text
          x={NODE_WIDTH / 2 - 16}
          y={-NODE_HEIGHT / 2 + 38}
          fill="var(--color-ctp-overlay1)"
          fontSize="14"
          fontFamily="var(--font-mono)"
          dominantBaseline="middle"
          textAnchor="middle"
        >
          {node.isExpanded ? "\u25B4" : "\u25BE"}
        </text>
      )}
    </motion.g>
  );
}
