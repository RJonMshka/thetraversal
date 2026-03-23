"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getGlowClasses } from "@/lib/glow";
import { useTraversalState } from "@/hooks/useTraversalState";
import { countNodes } from "@/lib/traversal";
import {
  generateTraversalSummary,
  getTraversalDepth,
} from "@/lib/traversal-summary";
import { PORTFOLIO_AST } from "@/data/ast";
import type { ContextWindowEntry, ASTNodeType } from "@/lib/ast-types";

// ── Props ──────────────────────────────────────────────────────────────

interface ContextWindowProps {
  /** Whether this panel is visible (controlled by parent) */
  isOpen: boolean;
  /** Callback to close/toggle the panel */
  onClose: () => void;
  /** Display variant */
  variant?: "sidebar" | "overlay";
}

// ── Node type icons ────────────────────────────────────────────────────
// Short monospace symbols conveying AST node type at a glance.

const TYPE_ICON: Partial<Record<ASTNodeType, string>> = {
  RootNode: "◆",
  ProgramNode: "◈",
  BlockStatement: "{ }",
  FunctionDeclaration: "fn()",
  ObjectExpression: "{ }",
  ExpressionStatement: "()",
  CallExpression: "()",
  VariableDeclaration: "var",
  ArrayExpression: "[ ]",
  ExportDeclaration: "↗",
  StringLiteral: '""',
  ImportDeclaration: "↙",
  TypeAnnotation: ":",
};

function getTypeIcon(type: ASTNodeType): string {
  return TYPE_ICON[type] ?? "·";
}

// ── Time formatter ─────────────────────────────────────────────────────

function formatTimestamp(ts: number): string {
  const now = Date.now();
  const diffMs = now - ts;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  return `${Math.floor(diffSec / 3600)}h ago`;
}

// ── ContextEntry component ─────────────────────────────────────────────

interface ContextEntryProps {
  entry: ContextWindowEntry;
  index: number;
  onClick: (slug: string) => void;
}

function ContextEntry({ entry, index, onClick }: ContextEntryProps) {
  const glow = getGlowClasses(entry.glowColor);

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
      onClick={() => onClick(entry.slug)}
      className={cn(
        "w-full flex items-start gap-2 px-3 py-2 rounded",
        "text-left transition-colors duration-150",
        "hover:bg-ctp-surface0 group"
      )}
    >
      {/* Index */}
      <span className="text-ctp-overlay0 text-[10px] font-mono shrink-0 w-5 text-right mt-0.5">
        {index + 1}
      </span>

      {/* Type icon */}
      <span
        className={cn(
          "text-[10px] font-mono shrink-0 mt-0.5 w-8 opacity-60",
          glow.text
        )}
      >
        {getTypeIcon(entry.type)}
      </span>

      {/* Label + timestamp */}
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "block text-xs font-mono font-medium truncate",
            glow.text
          )}
        >
          {entry.label}
        </span>
        <span className="block text-[10px] font-mono text-ctp-overlay0 mt-0.5">
          {formatTimestamp(entry.visitedAt)}
        </span>
      </div>

      {/* Navigate arrow — visible on hover */}
      <span className="text-ctp-overlay0 text-xs opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0">
        →
      </span>
    </motion.button>
  );
}

// ── Share URL helper ───────────────────────────────────────────────────

function buildShareUrl(visitedSlugs: string[]): string {
  const params = new URLSearchParams({
    traversal: visitedSlugs.join(","),
  });
  const base =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/tree?${params.toString()}`;
}

// ── ContextWindow ──────────────────────────────────────────────────────

export function ContextWindow({
  isOpen,
  onClose,
  variant = "sidebar",
}: ContextWindowProps) {
  const router = useRouter();
  const contextWindow = useTraversalState((s) => s.contextWindow);
  const visitedNodes = useTraversalState((s) => s.visitedNodes);
  const resetTraversal = useTraversalState((s) => s.resetTraversal);
  const totalNodes = useMemo(() => countNodes(PORTFOLIO_AST), []);

  const summary = useMemo(
    () => generateTraversalSummary(contextWindow),
    [contextWindow]
  );
  const maxDepth = useMemo(
    () => getTraversalDepth(contextWindow),
    [contextWindow]
  );

  const handleNodeClick = useCallback(
    (slug: string) => {
      router.push(`/node/${slug}`);
    },
    [router]
  );

  const handleShare = useCallback(async () => {
    const url = buildShareUrl(visitedNodes);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback: open the URL in a prompt
      prompt("Copy this traversal URL:", url);
    }
  }, [visitedNodes]);

  const handleReset = useCallback(() => {
    resetTraversal();
  }, [resetTraversal]);

  const isSidebar = variant === "sidebar";

  // ── Panel animation variants ──────────────────────────────────────
  const panelVariants = isSidebar
    ? {
        initial: { x: "100%", opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: "100%", opacity: 0 },
      }
    : {
        initial: { y: "100%", opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: "100%", opacity: 0 },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — only for overlay variant */}
          {!isSidebar && (
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-ctp-base/60 backdrop-blur-sm z-30"
              onClick={onClose}
            />
          )}

          {/* Panel */}
          <motion.div
            key="context-panel"
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className={cn(
              "flex flex-col bg-ctp-mantle border-ctp-surface0 z-40",
              isSidebar
                ? "absolute right-0 top-0 bottom-0 w-72 border-l"
                : "absolute bottom-0 left-0 right-0 max-h-[70vh] rounded-t-xl border-t"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-ctp-surface0 shrink-0">
              <div>
                <h2 className="text-ctp-text text-xs font-mono font-semibold uppercase tracking-widest">
                  Context Window
                </h2>
                <p className="text-ctp-overlay0 text-[10px] font-mono mt-0.5">
                  {visitedNodes.length} / {totalNodes} nodes &middot; depth{" "}
                  {maxDepth}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-ctp-overlay1 hover:text-ctp-text transition-colors text-sm font-mono p-1"
                aria-label="Close context window"
              >
                ×
              </button>
            </div>

            {/* Entry list */}
            <div
              className="flex-1 overflow-y-auto py-2"
              style={{ overscrollBehavior: "contain" }}
            >
              {contextWindow.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-ctp-overlay0 text-xs font-mono">
                    No nodes visited yet.
                  </p>
                  <p className="text-ctp-overlay0 text-[10px] font-mono mt-1 opacity-70">
                    Explore the tree to build context.
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5 px-2">
                  {contextWindow.map((entry, i) => (
                    <ContextEntry
                      key={`${entry.slug}-${entry.visitedAt}`}
                      entry={entry}
                      index={i}
                      onClick={handleNodeClick}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Summary — appears after ≥8 nodes visited */}
            <AnimatePresence>
              {summary && (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-t border-ctp-surface0 shrink-0 overflow-hidden"
                >
                  <div className="px-4 py-3">
                    <p className="text-ctp-overlay0 text-[10px] font-mono uppercase tracking-widest mb-1">
                      Traversal insight
                    </p>
                    <p className="text-ctp-subtext0 text-xs font-mono leading-relaxed">
                      {summary}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer actions */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-ctp-surface0 shrink-0">
              <button
                onClick={handleShare}
                disabled={visitedNodes.length === 0}
                className={cn(
                  "flex-1 text-xs font-mono py-1.5 rounded border transition-colors",
                  visitedNodes.length > 0
                    ? "border-ctp-surface1 text-ctp-overlay1 hover:border-ctp-lavender hover:text-ctp-lavender"
                    : "border-ctp-surface0 text-ctp-overlay0 cursor-not-allowed opacity-50"
                )}
              >
                share traversal
              </button>
              <button
                onClick={handleReset}
                disabled={visitedNodes.length === 0}
                className={cn(
                  "text-xs font-mono py-1.5 px-3 rounded border transition-colors",
                  visitedNodes.length > 0
                    ? "border-ctp-surface1 text-ctp-overlay1 hover:border-ctp-red hover:text-ctp-red"
                    : "border-ctp-surface0 text-ctp-overlay0 cursor-not-allowed opacity-50"
                )}
              >
                reset
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
