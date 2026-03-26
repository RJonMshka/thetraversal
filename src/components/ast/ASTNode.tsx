"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { LayoutNode } from "@/hooks/useASTLayout";
import type { TraversalMode } from "@/lib/ast-types";
import {
  NODE_WIDTH,
  HEADER_SECTION_HEIGHT,
  SUMMARY_LINE_HEIGHT,
  MAX_SUMMARY_CHARS,
  MAX_BODY_CHARS,
  MAX_SUMMARY_LINES,
  MAX_BODY_LINES,
  SECTION_PADDING_Y,
  SECTION_GAP,
  getNodeHeight,
  getSummaryHeight,
  getBodyHeight,
} from "@/lib/node-dimensions";

// ── Props ──────────────────────────────────────────────────────────────

interface ASTNodeProps {
  node: LayoutNode;
  isVisited: boolean;
  isFocused: boolean;
  isOverflowing?: boolean;
  mode: TraversalMode;
  onNodeClick: (slug: string) => void;
  onNodeHover: (slug: string | null) => void;
  onNodeFocus?: (slug: string) => void;
}

// ── Constants ──────────────────────────────────────────────────────────

const BORDER_RADIUS = 8;
const SECTION_BORDER_RADIUS = 6;

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

// ── Text utilities ─────────────────────────────────────────────────────

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "\u2026" : str;
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (lines.length >= maxLines) break;
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length > 0) {
    lines[lines.length - 1] = truncate(lines[lines.length - 1], maxChars);
  }
  return lines;
}

// ── Section animation config ───────────────────────────────────────────
// Animate opacity only — scaleY on SVG <g> elements distorts stroke widths
// and causes a width flash when entering/exiting because the rect's full
// NODE_WIDTH is visible throughout the scaleY transition. Pure opacity
// gives a clean fade with no layout artifacts.

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const sectionTransition = {
  opacity: { duration: 0.15, ease: "easeOut" as const },
};

// ── Component ──────────────────────────────────────────────────────────

export function ASTNode({
  node,
  isVisited,
  isFocused,
  isOverflowing = false,
  mode,
  onNodeClick,
  onNodeHover,
  onNodeFocus,
}: ASTNodeProps) {
  const glowHex = resolveGlowColor(node.glowColor);
  const typeAbbrev = TYPE_ABBREV[node.type] ?? node.type;
  const filterId = `glow-${node.slug}`;
  const clipSummaryId = `clip-summary-${node.slug}`;
  const clipBodyId = `clip-body-${node.slug}`;
  const nodeHeight = getNodeHeight(node, mode);
  const summaryH = getSummaryHeight(node, mode);
  const bodyH = getBodyHeight(node, mode);

  // Truncate label if too long
  const displayLabel =
    node.label.length > 16 ? node.label.slice(0, 15) + "\u2026" : node.label;

  // Content for parse/eval modes
  const summaryLines =
    mode !== "lex" && node.content?.summary
      ? wrapText(node.content.summary, MAX_SUMMARY_CHARS, MAX_SUMMARY_LINES)
      : [];
  const bodyLine =
    mode === "eval" && node.content?.body
      ? truncate(node.content.body.replace(/\n/g, " "), MAX_BODY_CHARS)
      : null;

  // ── Layout positions (Y-origin = center of total node height) ────────
  const halfH = nodeHeight / 2;
  const headerTop = -halfH;
  const summaryTop = headerTop + HEADER_SECTION_HEIGHT + SECTION_GAP;
  const bodyTop = summaryTop + (summaryH > 0 ? summaryH + SECTION_GAP : 0);

  // Position springs — critically damped to eliminate overshoot.
  // Overshoot caused visible jitter on expand/collapse because the node
  // would spring past its target while the viewport was already pinned
  // to the new position. Critical damping (damping ratio ~1) ensures the
  // node lands precisely at its target without oscillation.
  const positionTransition = {
    type: "spring" as const,
    stiffness: 170,
    damping: 28,
    mass: 1,
    restDelta: 0.01,
    restSpeed: 0.01,
  };

  // Stack overflow easter egg
  const overflowHash = node.slug
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const overflowX = isOverflowing ? Math.sin(overflowHash) * 80 : 0;
  const overflowY = isOverflowing ? 300 + (overflowHash % 200) : 0;
  const overflowRotate = isOverflowing
    ? Math.sin(overflowHash * 0.7) * 30
    : 0;

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
      onFocus={() => {
        onNodeHover(node.slug);
        onNodeFocus?.(node.slug);
      }}
      onBlur={() => onNodeHover(null)}
    >
      {/* ── Defs: glow filter + section clipPaths ────────────────────── */}
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

        {/* ClipPath for summary section — text cannot escape this rect */}
        {summaryH > 0 && (
          <clipPath id={clipSummaryId}>
            <rect
              x={-NODE_WIDTH / 2}
              y={summaryTop}
              width={NODE_WIDTH}
              height={summaryH}
              rx={SECTION_BORDER_RADIUS}
            />
          </clipPath>
        )}

        {/* ClipPath for body section */}
        {bodyH > 0 && (
          <clipPath id={clipBodyId}>
            <rect
              x={-NODE_WIDTH / 2}
              y={bodyTop}
              width={NODE_WIDTH}
              height={bodyH}
              rx={SECTION_BORDER_RADIUS}
            />
          </clipPath>
        )}
      </defs>

      {/* ── Header section ───────────────────────────────────────────── */}
      <motion.rect
        x={-NODE_WIDTH / 2}
        y={headerTop}
        width={NODE_WIDTH}
        initial={{ height: HEADER_SECTION_HEIGHT }}
        animate={{ height: HEADER_SECTION_HEIGHT }}
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
        y={headerTop + 18}
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
        y={headerTop + 38}
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
          cy={headerTop + 14}
          r="4"
          fill={glowHex}
          opacity="0.6"
        />
      )}

      {/* Expand/collapse indicator */}
      {node.hasChildren && (
        <text
          x={NODE_WIDTH / 2 - 16}
          y={headerTop + 38}
          fill="var(--color-ctp-overlay1)"
          fontSize="14"
          fontFamily="var(--font-mono)"
          dominantBaseline="middle"
          textAnchor="middle"
        >
          {node.isExpanded ? "\u25B4" : "\u25BE"}
        </text>
      )}

      {/* ── Summary section (parse + eval modes) ─────────────────────── */}
      <AnimatePresence>
        {summaryH > 0 && (
          <motion.g
            key="summary-section"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={sectionVariants}
            transition={sectionTransition}
          >
            {/* Summary background rect */}
            <rect
              x={-NODE_WIDTH / 2}
              y={summaryTop}
              width={NODE_WIDTH}
              height={summaryH}
              rx={SECTION_BORDER_RADIUS}
              ry={SECTION_BORDER_RADIUS}
              fill="var(--color-ctp-mantle)"
              stroke={glowHex}
              strokeWidth={0.5}
              strokeOpacity={isFocused ? 0.4 : 0.15}
            />

            {/* Summary text — clipped to section bounds */}
            <g clipPath={`url(#${clipSummaryId})`}>
              {summaryLines.map((line, i) => (
                <text
                  key={`summary-${i}`}
                  x={-NODE_WIDTH / 2 + 10}
                  y={
                    summaryTop +
                    SECTION_PADDING_Y +
                    i * SUMMARY_LINE_HEIGHT +
                    SUMMARY_LINE_HEIGHT / 2 +
                    1
                  }
                  fill="var(--color-ctp-subtext0)"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                  dominantBaseline="middle"
                  opacity={0.85}
                >
                  {line}
                </text>
              ))}
            </g>
          </motion.g>
        )}
      </AnimatePresence>

      {/* ── Body section (eval mode only) ────────────────────────────── */}
      <AnimatePresence>
        {bodyH > 0 && bodyLine && (
          <motion.g
            key="body-section"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={sectionVariants}
            transition={{
              ...sectionTransition,
              // Slightly delayed so it enters after summary
              opacity: { duration: 0.15, ease: "easeOut" as const, delay: 0.05 },
            }}
          >
            {/* Body background rect */}
            <rect
              x={-NODE_WIDTH / 2}
              y={bodyTop}
              width={NODE_WIDTH}
              height={bodyH}
              rx={SECTION_BORDER_RADIUS}
              ry={SECTION_BORDER_RADIUS}
              fill="var(--color-ctp-crust)"
              stroke={glowHex}
              strokeWidth={0.5}
              strokeOpacity={isFocused ? 0.3 : 0.1}
            />

            {/* Body text — clipped to section bounds */}
            <g clipPath={`url(#${clipBodyId})`}>
              <text
                x={-NODE_WIDTH / 2 + 10}
                y={bodyTop + SECTION_PADDING_Y + SUMMARY_LINE_HEIGHT / 2 + 1}
                fill="var(--color-ctp-overlay1)"
                fontSize="8"
                fontFamily="var(--font-mono)"
                dominantBaseline="middle"
                opacity={0.65}
              >
                {bodyLine}
              </text>
            </g>
          </motion.g>
        )}
      </AnimatePresence>
    </motion.g>
  );
}
