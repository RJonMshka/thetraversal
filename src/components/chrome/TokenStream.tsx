"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getTokenStream } from "@/lib/traversal";
import { useTraversalState } from "@/hooks/useTraversalState";
import { PORTFOLIO_AST } from "@/data/ast";
import type { TokenStreamEntry } from "@/lib/ast-types";

// Module-level constant — PORTFOLIO_AST is static, so the token stream
// is computed once at import time and shared across all renders.
const TOKENS = getTokenStream(PORTFOLIO_AST);

// ── Props ──────────────────────────────────────────────────────────────

interface TokenStreamProps {
  /** Slug of the currently focused/active node, if any */
  activeSlug?: string | null;
  /** Whether the bar is visible */
  visible?: boolean;
}

// ── Token color map ────────────────────────────────────────────────────
// Each token type gets a distinct Catppuccin color for the lexer aesthetic.

function getTokenColor(token: TokenStreamEntry): string {
  switch (token.type) {
    case "KEYWORD":
      return "text-ctp-mauve";
    case "IDENT":
      return "text-ctp-peach";
    case "OP":
      return "text-ctp-teal";
    case "LITERAL":
      return "text-ctp-green";
    default:
      return "text-ctp-text";
  }
}

// ── Token component ────────────────────────────────────────────────────

interface TokenProps {
  token: TokenStreamEntry;
  isActive: boolean;
  isVisited: boolean;
  onClick?: () => void;
}

function Token({ token, isActive, isVisited, onClick }: TokenProps) {
  const isNavigable = !!token.slug && !!onClick;
  const colorClass = getTokenColor(token);

  if (token.type === "OP") {
    return (
      <span className="text-ctp-overlay0 select-none px-1 shrink-0">
        {token.value}
      </span>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={!isNavigable}
      className={cn(
        "relative flex flex-col items-start shrink-0 px-2 py-0.5 rounded",
        "transition-colors duration-150",
        isNavigable
          ? "cursor-pointer hover:bg-ctp-surface0"
          : "cursor-default",
        isActive && "bg-ctp-surface0"
      )}
      whileHover={isNavigable ? { y: -1 } : {}}
      transition={{ duration: 0.1 }}
    >
      {/* Type label */}
      <span className="text-ctp-overlay0 text-[9px] leading-none font-mono select-none">
        {token.type}
      </span>

      {/* Token value */}
      <span
        className={cn(
          "text-xs font-mono font-medium leading-tight",
          colorClass,
          isActive && "brightness-125",
          isVisited && !isActive && "opacity-60"
        )}
      >
        {`"${token.value}"`}
      </span>

      {/* Active indicator underline */}
      <AnimatePresence>
        {isActive && (
          <motion.span
            key="active-underline"
            className="absolute bottom-0 left-0 right-0 h-px bg-ctp-lavender"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Visited dot */}
      {isVisited && !isActive && (
        <span
          className={cn(
            "absolute top-1 right-1 w-1 h-1 rounded-full opacity-50",
            colorClass.replace("text-", "bg-")
          )}
        />
      )}
    </motion.button>
  );
}

// ── TokenStream ────────────────────────────────────────────────────────

export function TokenStream({ activeSlug, visible = true }: TokenStreamProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTokenRef = useRef<HTMLDivElement>(null);
  const isVisited = useTraversalState((s) => s.isVisited);
  const hasHydrated = useTraversalState((s) => s.hasHydrated);

  // Scroll to active token whenever activeSlug changes
  useEffect(() => {
    if (!activeTokenRef.current || !scrollRef.current) return;

    const container = scrollRef.current;
    const activeEl = activeTokenRef.current;
    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();

    // Only scroll if the active token is out of view
    const isOutOfView =
      activeRect.left < containerRect.left + 16 ||
      activeRect.right > containerRect.right - 16;

    if (isOutOfView) {
      const scrollLeft =
        container.scrollLeft +
        (activeRect.left - containerRect.left) -
        containerRect.width / 2 +
        activeRect.width / 2;

      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [activeSlug]);

  const handleTokenClick = useCallback(
    (slug: string) => {
      router.push(`/node/${slug}`);
    },
    [router]
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="token-stream"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute bottom-0 left-0 right-0 h-10 bg-ctp-mantle border-t border-ctp-surface0 z-20"
          role="navigation"
          aria-label="Career token stream"
        >
          {/* Fade gradients on left/right edges to hint scrollability */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-ctp-mantle to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-ctp-mantle to-transparent z-10 pointer-events-none" />

          {/* Scrollable token container */}
          <div
            ref={scrollRef}
            className="h-full flex items-center gap-0.5 px-6 overflow-x-auto scrollbar-hidden"
          >
            {/* Stream prefix */}
            <span className="text-ctp-overlay0 text-[10px] font-mono shrink-0 mr-2 select-none">
              STREAM
            </span>

            {TOKENS.map((token, idx) => {
              const isActive = !!(token.slug && token.slug === activeSlug);
              const visited = !!(hasHydrated && token.slug && isVisited(token.slug));

              return (
                <div
                  key={`${token.type}-${token.value}-${idx}`}
                  ref={isActive ? activeTokenRef : null}
                >
                  <Token
                    token={token}
                    isActive={isActive}
                    isVisited={visited}
                    onClick={
                      token.slug
                        ? () => handleTokenClick(token.slug!)
                        : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
