"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useTraversalState } from "@/hooks/useTraversalState";
import { getGlowClasses } from "@/lib/glow";
import { cn } from "@/lib/utils";
import type { ASTNode } from "@/lib/ast-types";
import type { TraversalMode } from "@/lib/ast-types";

// ── Props ──────────────────────────────────────────────────────────────

interface ASTMobileTreeProps {
  ast: ASTNode;
  mode: TraversalMode;
}

interface MobileTreeNodeProps {
  node: ASTNode;
  mode: TraversalMode;
  depth: number;
}

// ── Type badge abbreviations ───────────────────────────────────────────

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

// ── Framer Motion variants ─────────────────────────────────────────────

const childrenVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.2, ease: "easeInOut" as const },
  },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
};

const chevronVariants = {
  collapsed: { rotate: 0 },
  expanded: { rotate: 90 },
};

// ── Single Node Row ────────────────────────────────────────────────────

function MobileTreeNode({ node, mode, depth }: MobileTreeNodeProps) {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const glow = getGlowClasses(node.glowColor);

  // Zustand selectors
  const isExpanded = useTraversalState((s) => s.isExpanded(node.slug));
  const isVisited = useTraversalState((s) => s.isVisited(node.slug));
  const toggleExpand = useTraversalState((s) => s.toggleExpand);
  const visitNode = useTraversalState((s) => s.visitNode);

  const typeAbbrev = TYPE_ABBREV[node.type] ?? node.type;

  const handleExpand = useCallback(() => {
    toggleExpand(node.slug);
    visitNode(node.slug, node.label, node.type, node.glowColor);
  }, [toggleExpand, visitNode, node.slug, node.label, node.type, node.glowColor]);

  const handleVisit = useCallback(() => {
    visitNode(node.slug, node.label, node.type, node.glowColor);
  }, [visitNode, node.slug, node.label, node.type, node.glowColor]);

  // Content to show based on mode
  const showSummary = mode !== "lex" && isExpanded && node.content?.summary;
  const showBody = mode === "eval" && isExpanded && node.content?.body;

  return (
    <div
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-label={`${node.type}: ${node.label}${isVisited ? ", visited" : ""}`}
    >
      {/* ── Node row ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "group flex items-center gap-2 py-2.5 px-3 rounded-md",
          "border-l-2 transition-colors duration-150",
          glow.border,
          isVisited ? "" : "hover:bg-white/[0.03] active:bg-white/[0.06]"
        )}
        style={{
          marginLeft: `${depth * 16}px`,
          background: isVisited ? "rgba(255,255,255,0.03)" : undefined,
        }}
      >
        {/* Expand/collapse chevron */}
        {hasChildren ? (
          <button
            onClick={handleExpand}
            className={cn(
              "flex items-center justify-center w-6 h-6 rounded shrink-0",
              "text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface1/50",
              "transition-colors duration-150"
            )}
            aria-label={isExpanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
          >
            <motion.span
              variants={chevronVariants}
              animate={isExpanded ? "expanded" : "collapsed"}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="inline-block text-sm leading-none"
            >
              &#x25B6;
            </motion.span>
          </button>
        ) : (
          <span className="w-6 h-6 shrink-0 flex items-center justify-center text-ctp-overlay0 text-xs">
            &#x2022;
          </span>
        )}

        {/* Type badge — only shown in lex/parse mode; eval shows human labels only */}
        {mode !== "eval" && (
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              lineHeight: 1,
              padding: "2px 6px",
              borderRadius: 3,
              background: "var(--ink-3)",
              border: "1px solid var(--line-2)",
              color: "var(--text-faint)",
              userSelect: "none",
              flexShrink: 0,
              letterSpacing: "0.04em",
            }}
          >
            {typeAbbrev}
          </span>
        )}

        {/* Label — links to node detail page */}
        <Link
          href={`/node/${node.slug}`}
          onClick={handleVisit}
          className={cn(
            "flex-1 min-w-0 font-mono text-sm truncate transition-colors duration-150",
            glow.text,
            "hover:underline underline-offset-2"
          )}
        >
          {node.label}
        </Link>

        {/* Visited indicator */}
        {isVisited && (
          <span
            className={cn(
              "shrink-0 w-2 h-2 rounded-full",
              glow.text.replace("text-", "bg-"),
              "opacity-50"
            )}
          />
        )}
      </div>

      {/* ── Content preview (parse/eval mode) ────────────────────── */}
      <AnimatePresence initial={false}>
        {showSummary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p
              className="text-xs text-ctp-subtext0 font-mono pl-3 pr-3 pb-1 pt-0.5 leading-relaxed"
              style={{ marginLeft: `${depth * 16 + 36}px` }}
            >
              {node.content?.summary}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {showBody && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div
              className="text-xs text-ctp-overlay1 font-mono pl-3 pr-3 pb-2 leading-relaxed"
              style={{ marginLeft: `${depth * 16 + 36}px` }}
            >
              <p className="line-clamp-3">{node.content?.body}</p>
              <Link
                href={`/node/${node.slug}`}
                className={cn(
                  "inline-block mt-1 text-[11px]",
                  glow.text,
                  "hover:underline underline-offset-2"
                )}
              >
                Read more &rarr;
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Children (recursive) ─────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {hasChildren && isExpanded && (
          <motion.div
            key={`children-${node.slug}`}
            variants={childrenVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            className="overflow-hidden"
            role="group"
          >
            {node.children!.map((child) => (
              <MobileTreeNode
                key={child.id}
                node={child}
                mode={mode}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export function ASTMobileTree({ ast, mode }: ASTMobileTreeProps) {
  const hasHydrated = useTraversalState((s) => s.hasHydrated);

  // Don't render persisted expanded state until hydration completes
  // to avoid SSR/client mismatch.
  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center h-32 text-ctp-overlay1 font-mono text-sm animate-pulse">
        loading tree...
      </div>
    );
  }

  return (
    <nav
      className="py-3 px-2 overflow-y-auto h-full"
      role="tree"
      aria-label="Portfolio AST"
    >
      {/* Render root's children directly — the root node itself is
          represented by the page header, not a list item */}
      {ast.children?.map((child) => (
        <MobileTreeNode key={child.id} node={child} mode={mode} depth={0} />
      ))}
    </nav>
  );
}
