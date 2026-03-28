"use client";

import { useRef, useState, useCallback } from "react";
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
  onNodeNavigate: (slug: string) => void;
  onNodeHover: (slug: string | null) => void;
  onNodeFocus?: (slug: string) => void;
}

// ── Constants ──────────────────────────────────────────────────────────

const BORDER_RADIUS = 8;
const SECTION_BORDER_RADIUS = 6;

/** Duration (ms) of the long-press before navigation fires. */
const LONG_PRESS_DURATION = 1500;

/** Gradient feather width (px) on the leading edge of the wave fill. */
const WAVE_FEATHER = 24;

/** Expanded line counts on hover. */
const HOVER_SUMMARY_LINES = 4;
const HOVER_BODY_LINES = 3;

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
// Fade-in/out for sections entering/leaving the DOM (mode switches).

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const sectionTransition = {
  opacity: { duration: 0.15, ease: "easeOut" as const },
};



// ── Expand height helpers ──────────────────────────────────────────────
//
// On hover we expand the summary and body section rects to reveal more
// text. The clipPath rect inside <defs> is also a motion.rect so its
// height animates in sync with the visible rect, keeping the clip tight.
//
// "Collapsed" height = what node-dimensions returns (the layout height).
// "Expanded" height  = enough rows to show HOVER_SUMMARY_LINES / HOVER_BODY_LINES.

function expandedSummaryHeight(lines: string[]): number {
  return lines.length * SUMMARY_LINE_HEIGHT + SECTION_PADDING_Y * 2;
}

function expandedBodyHeight(lines: string[]): number {
  return lines.length * SUMMARY_LINE_HEIGHT + SECTION_PADDING_Y * 2;
}

// Spring for height expansion — snappy but not jerky.
const expandSpring = {
  type: "spring" as const,
  stiffness: 260,
  damping: 28,
  mass: 0.6,
};

// ── Component ──────────────────────────────────────────────────────────

export function ASTNode({
  node,
  isVisited,
  isFocused,
  isOverflowing = false,
  mode,
  onNodeClick,
  onNodeNavigate,
  onNodeHover,
  onNodeFocus,
}: ASTNodeProps) {
  const isLeaf = !node.hasChildren;
  const glowHex = resolveGlowColor(node.glowColor);
  const typeAbbrev = TYPE_ABBREV[node.type] ?? node.type;
  const filterId = `glow-${node.slug}`;
  const clipSummaryId = `clip-summary-${node.slug}`;
  const clipBodyId = `clip-body-${node.slug}`;
  const nodeHeight = getNodeHeight(node, mode);
  const summaryH = getSummaryHeight(node, mode);
  const bodyH = getBodyHeight(node, mode);

  // ── Long-press state ───────────────────────────────────────────────
  const [pressProgress, setPressProgress] = useState(0); // 0–1
  const pressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pressStartRef = useRef<number>(0);
  const hasFiredRef = useRef(false);
  const isPressingRef = useRef(false);

  const cancelPress = useCallback(() => {
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setPressProgress(0);
    hasFiredRef.current = false;
    isPressingRef.current = false;
  }, []);

  const startPress = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if ("button" in e && e.button !== 0) return;
      if ("ctrlKey" in e && (e.ctrlKey || e.metaKey)) return;

      isPressingRef.current = true;
      hasFiredRef.current = false;
      pressStartRef.current = performance.now();
      setPressProgress(0);

      pressTimerRef.current = setInterval(() => {
        const elapsed = performance.now() - pressStartRef.current;
        const ratio = Math.min(elapsed / LONG_PRESS_DURATION, 1);
        setPressProgress(ratio);
        if (ratio >= 1 && !hasFiredRef.current) {
          hasFiredRef.current = true;
          cancelPress();
          onNodeNavigate(node.slug);
        }
      }, 16);
    },
    [node.slug, onNodeNavigate, cancelPress]
  );

  const endPress = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const wasActuallyPressing = isPressingRef.current;
      const hasFired = hasFiredRef.current;
      cancelPress();

      if (wasActuallyPressing && !hasFired) {
        e.stopPropagation();
        if (isLeaf) {
          onNodeNavigate(node.slug);
        } else {
          onNodeClick(node.slug);
        }
      }
    },
    [cancelPress, isLeaf, node.slug, onNodeClick, onNodeNavigate]
  );

  // ── Truncate label if too long ─────────────────────────────────────
  const displayLabel =
    node.label.length > 16 ? node.label.slice(0, 15) + "\u2026" : node.label;

  // ── Text content ──────────────────────────────────────────────────
  // Collapsed: limited lines shown in the layout.
  // Expanded:  more lines revealed on hover by growing the section rect.

  // Summary — collapsed (2 lines max, used for layout)
  const summaryLinesCollapsed =
    mode !== "lex" && node.content?.summary
      ? wrapText(node.content.summary, MAX_SUMMARY_CHARS, MAX_SUMMARY_LINES)
      : [];

  // Summary — expanded (4 lines max, revealed on hover)
  // Always computed so we know the expanded height even in lex mode.
  const summaryLinesExpanded = node.content?.summary
    ? wrapText(node.content.summary, MAX_SUMMARY_CHARS, HOVER_SUMMARY_LINES)
    : [];

  // Body — collapsed (1 truncated line, used for layout)
  const bodyLineCollapsed =
    mode === "eval" && node.content?.body
      ? truncate(node.content.body.replace(/\n/g, " "), MAX_BODY_CHARS)
      : null;

  // Body — expanded (3 lines max, revealed on hover)
  const bodyLinesExpanded = node.content?.body
    ? wrapText(node.content.body.replace(/\n/g, " "), MAX_BODY_CHARS, HOVER_BODY_LINES)
    : [];

  // ── Hover expansion logic ─────────────────────────────────────────
  //
  // In lex mode:   hover reveals the summary section (hidden by default).
  // In parse mode: hover expands the summary from 2 → 4 lines.
  //                hover also reveals the body section (hidden by default in parse).
  // In eval mode:  hover expands summary 2→4 and body 1→3 lines.
  //
  // The section rect height and its matching clipPath rect both animate
  // via motion.rect so the reveal is a smooth spring-driven grow.

  const hasSummaryContent = Boolean(node.content?.summary);
  const hasBodyContent = Boolean(node.content?.body);

  // Whether a summary section should be drawn at all (collapsed or expanded)
  const showSummarySection =
    (mode !== "lex" && hasSummaryContent) || (isFocused && hasSummaryContent);

  // Whether a body section should be drawn at all
  const showBodySection =
    (mode === "eval" && hasBodyContent) || (isFocused && hasBodyContent && mode !== "lex");

  // Collapsed heights (from layout math — what the tree uses for spacing)
  const collapsedSummaryH = summaryH; // 0 in lex mode
  const collapsedBodyH = bodyH; // 0 unless eval mode

  // Expanded heights (driven by hover)
  const expandedSummaryH =
    summaryLinesExpanded.length > 0
      ? expandedSummaryHeight(summaryLinesExpanded)
      : collapsedSummaryH;
  const expandedBodyH =
    bodyLinesExpanded.length > 0
      ? expandedBodyHeight(bodyLinesExpanded)
      : collapsedBodyH;

  // Actual animated heights — these are what the rects + clipPaths use
  const activeSummaryH = isFocused
    ? expandedSummaryH
    : collapsedSummaryH > 0
    ? collapsedSummaryH
    : 0;

  const activeBodyH = isFocused
    ? expandedBodyH
    : collapsedBodyH > 0
    ? collapsedBodyH
    : 0;

  // ── Layout positions (Y-origin = center of total node height) ────────
  const halfH = nodeHeight / 2;
  const headerTop = -halfH;
  const summaryTop = headerTop + HEADER_SECTION_HEIGHT + SECTION_GAP;
  // Body top is always just below summary — but body section floats below
  // the *collapsed* summary to avoid shifting the tree layout on hover.
  // (The summary expands downward and overlaps; body Y is fixed.)
  const bodyTop = summaryTop + (collapsedSummaryH > 0 ? collapsedSummaryH + SECTION_GAP : 0);

  // Position springs
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

  // Wave fill clip + gradient IDs (unique per node)
  const waveClipId = `wave-clip-${node.slug}`;
  const waveGradientId = `wave-grad-${node.slug}`;

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
      aria-label={`${node.type}: ${node.label}${isVisited ? ", visited" : ""}${isLeaf ? ". Click to open detail page" : ". Click to expand. Hold to open detail page"}`}
      aria-description={
        isLeaf
          ? "Click to open detail page"
          : "Click to expand or collapse. Hold for 1.5 seconds to open the detail page. Press Ctrl+Enter to navigate immediately."
      }
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
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={(e) => {
        cancelPress();
        onNodeHover(null);
        e.stopPropagation();
      }}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchCancel={cancelPress}
      onMouseEnter={() => onNodeHover(node.slug)}
      onFocus={() => {
        onNodeHover(node.slug);
        onNodeFocus?.(node.slug);
      }}
      onBlur={() => {
        cancelPress();
        onNodeHover(null);
      }}
    >
      {/* ── Defs: glow filter + animated clipPaths ───────────────────── */}
      {/* The clipPath rects are motion.rect so they animate in sync with */}
      {/* the visible section rects, masking text to the growing height.  */}
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

        {showSummarySection && activeSummaryH > 0 && (
          <clipPath id={clipSummaryId}>
            <motion.rect
              x={-NODE_WIDTH / 2}
              y={summaryTop}
              width={NODE_WIDTH}
              rx={SECTION_BORDER_RADIUS}
              animate={{ height: activeSummaryH }}
              transition={expandSpring}
            />
          </clipPath>
        )}

        {showBodySection && activeBodyH > 0 && (
          <clipPath id={clipBodyId}>
            <motion.rect
              x={-NODE_WIDTH / 2}
              y={bodyTop}
              width={NODE_WIDTH}
              rx={SECTION_BORDER_RADIUS}
              animate={{ height: activeBodyH }}
              transition={expandSpring}
            />
          </clipPath>
        )}

        {/* Wave fill: clip to rounded header shape, gradient for soft leading edge */}
        <clipPath id={waveClipId}>
          <rect
            x={-NODE_WIDTH / 2}
            y={headerTop}
            width={NODE_WIDTH}
            height={HEADER_SECTION_HEIGHT}
            rx={BORDER_RADIUS}
            ry={BORDER_RADIUS}
          />
        </clipPath>

        <linearGradient id={waveGradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={glowHex} stopOpacity="0.22" />
          <stop
            offset={`${Math.max(0, 100 - (WAVE_FEATHER / NODE_WIDTH) * 100)}%`}
            stopColor={glowHex}
            stopOpacity="0.22"
          />
          <stop offset="100%" stopColor={glowHex} stopOpacity="0.06" />
        </linearGradient>
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

      {/* Expand/collapse indicator (hidden while progress ring is active) */}
      {node.hasChildren && pressProgress === 0 && (
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

      {/* Navigation arrow for focused leaf nodes (hidden while pressing) */}
      {isLeaf && isFocused && pressProgress === 0 && (
        <text
          x={NODE_WIDTH / 2 - 16}
          y={headerTop + 38}
          fill={glowHex}
          fontSize="12"
          fontFamily="var(--font-mono)"
          dominantBaseline="middle"
          textAnchor="middle"
          opacity={0.7}
        >
          {"\u2192"}
        </text>
      )}

      {/* ── Long-press wave fill ─────────────────────────────────────── */}
      {/* A colored overlay sweeps left→right across the header rect.   */}
      {/* Clipped to the header's rounded shape so it looks like the    */}
      {/* node itself is filling up. A gradient on the leading edge     */}
      {/* gives it a soft, wave-like feel.                              */}
      <AnimatePresence>
        {pressProgress > 0 && (
          <motion.g
            key="wave-fill"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            clipPath={`url(#${waveClipId})`}
          >
            <rect
              x={-NODE_WIDTH / 2}
              y={headerTop}
              width={NODE_WIDTH * pressProgress}
              height={HEADER_SECTION_HEIGHT}
              fill={`url(#${waveGradientId})`}
            />
          </motion.g>
        )}
      </AnimatePresence>

      {/* ── Summary section ───────────────────────────────────────────── */}
      {/* Visible in parse/eval mode always; also shown on hover in lex.  */}
      {/* On hover the rect grows from collapsed → expanded height,       */}
      {/* revealing additional wrapped lines via the animated clipPath.   */}
      <AnimatePresence>
        {showSummarySection && activeSummaryH > 0 && (
          <motion.g
            key="summary-section"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={sectionVariants}
            transition={sectionTransition}
          >
            {/* Section background — height springs to expanded/collapsed */}
            <motion.rect
              x={-NODE_WIDTH / 2}
              y={summaryTop}
              width={NODE_WIDTH}
              rx={SECTION_BORDER_RADIUS}
              ry={SECTION_BORDER_RADIUS}
              fill="var(--color-ctp-mantle)"
              stroke={glowHex}
              strokeWidth={0.5}
              strokeOpacity={isFocused ? 0.4 : 0.15}
              animate={{ height: activeSummaryH }}
              transition={expandSpring}
            />

            {/* All expanded lines — clipPath hides rows beyond current height */}
            <g clipPath={`url(#${clipSummaryId})`}>
              {summaryLinesExpanded.map((line, i) => (
                <motion.text
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
                  // Lines beyond the collapsed count fade in when expanded
                  animate={{
                    opacity: isFocused || i < summaryLinesCollapsed.length ? 0.85 : 0,
                  }}
                  transition={{ duration: 0.2, ease: "easeOut", delay: i * 0.03 }}
                >
                  {line}
                </motion.text>
              ))}
            </g>
          </motion.g>
        )}
      </AnimatePresence>

      {/* ── Body section ─────────────────────────────────────────────── */}
      {/* Visible in eval mode always; also shown on hover in parse mode.  */}
      {/* On hover expands from 1 truncated line → up to 3 full lines.   */}
      <AnimatePresence>
        {showBodySection && activeBodyH > 0 && (
          <motion.g
            key="body-section"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={sectionVariants}
            transition={{
              ...sectionTransition,
              opacity: { duration: 0.15, ease: "easeOut" as const, delay: 0.05 },
            }}
          >
            <motion.rect
              x={-NODE_WIDTH / 2}
              y={bodyTop}
              width={NODE_WIDTH}
              rx={SECTION_BORDER_RADIUS}
              ry={SECTION_BORDER_RADIUS}
              fill="var(--color-ctp-crust)"
              stroke={glowHex}
              strokeWidth={0.5}
              strokeOpacity={isFocused ? 0.3 : 0.1}
              animate={{ height: activeBodyH }}
              transition={expandSpring}
            />

            <g clipPath={`url(#${clipBodyId})`}>
              {bodyLinesExpanded.map((line, i) => (
                <motion.text
                  key={`body-${i}`}
                  x={-NODE_WIDTH / 2 + 10}
                  y={
                    bodyTop +
                    SECTION_PADDING_Y +
                    i * SUMMARY_LINE_HEIGHT +
                    SUMMARY_LINE_HEIGHT / 2 +
                    1
                  }
                  fill="var(--color-ctp-overlay1)"
                  fontSize="8"
                  fontFamily="var(--font-mono)"
                  dominantBaseline="middle"
                  animate={{
                    opacity: isFocused || i === 0 ? 0.65 : 0,
                  }}
                  transition={{ duration: 0.2, ease: "easeOut", delay: i * 0.04 }}
                >
                  {line}
                </motion.text>
              ))}
            </g>
          </motion.g>
        )}
      </AnimatePresence>
    </motion.g>
  );
}
