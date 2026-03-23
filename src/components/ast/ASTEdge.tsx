"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { LayoutEdge } from "@/hooks/useASTLayout";

// ── Props ──────────────────────────────────────────────────────────────

interface ASTEdgeProps {
  edge: LayoutEdge;
  isHighlighted: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────

const NODE_HEIGHT = 60;

// Spring config matching the node position springs — edges and nodes
// move in lockstep so the tree feels like a single connected organism.
const springConfig = { stiffness: 170, damping: 26, mass: 1 };

// ── Component ──────────────────────────────────────────────────────────
// Renders a curved bezier path between parent and child nodes.
// Edge positions animate smoothly via spring-driven motion values,
// keeping edges attached to their nodes as the tree reshapes.

export function ASTEdge({ edge, isHighlighted }: ASTEdgeProps) {
  const isFirstRender = useRef(true);

  // Spring-animated coordinates — edges track node positions smoothly.
  // On first render, snap to position (no spring). After that, spring.
  const sourceX = useSpring(edge.sourceX, springConfig);
  const sourceYRaw = useSpring(edge.sourceY, springConfig);
  const targetX = useSpring(edge.targetX, springConfig);
  const targetYRaw = useSpring(edge.targetY, springConfig);

  // Offset Y by half node height (source = bottom of parent, target = top of child)
  const sourceY = useTransform(sourceYRaw, (v) => v + NODE_HEIGHT / 2);
  const targetY = useTransform(targetYRaw, (v) => v - NODE_HEIGHT / 2);
  const midY = useTransform(
    [sourceY, targetY],
    ([s, t]: number[]) => (s + t) / 2
  );

  // Build the SVG path string from animated values
  const d = useTransform(
    [sourceX, sourceY, midY, targetX, targetY],
    ([sx, sy, my, tx, ty]: number[]) =>
      `M ${sx} ${sy} C ${sx} ${my}, ${tx} ${my}, ${tx} ${ty}`
  );

  // Update spring targets when edge coordinates change.
  // On first render, jump instantly so entering edges don't spring from 0,0.
  if (isFirstRender.current) {
    sourceX.jump(edge.sourceX);
    sourceYRaw.jump(edge.sourceY);
    targetX.jump(edge.targetX);
    targetYRaw.jump(edge.targetY);
    isFirstRender.current = false;
  } else {
    sourceX.set(edge.sourceX);
    sourceYRaw.set(edge.sourceY);
    targetX.set(edge.targetX);
    targetYRaw.set(edge.targetY);
  }

  return (
    <motion.path
      d={d}
      fill="none"
      stroke={
        isHighlighted
          ? "var(--color-ctp-lavender)"
          : "var(--color-ctp-surface1)"
      }
      strokeWidth={isHighlighted ? 2 : 1}
      strokeOpacity={isHighlighted ? 0.8 : 0.4}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      exit={{ pathLength: 0, opacity: 0 }}
      transition={{
        pathLength: { duration: 0.6, ease: "easeOut" },
        opacity: { duration: 0.3 },
      }}
    />
  );
}
