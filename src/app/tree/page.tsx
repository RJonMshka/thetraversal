"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { ASTCanvas } from "@/components/ast/ASTCanvas";
import { TraversalModeSelector } from "@/components/ast/TraversalModeSelector";
import { TokenStream } from "@/components/chrome/TokenStream";
import { ContextWindow } from "@/components/chrome/ContextWindow";
import { useTraversalState } from "@/hooks/useTraversalState";
import { findNode } from "@/lib/traversal";
import { PORTFOLIO_AST } from "@/data/ast";
import { cn } from "@/lib/utils";
import type { TraversalMode } from "@/lib/ast-types";

// ── Tree Page Inner ────────────────────────────────────────────────────
// Extracted to a separate component because useSearchParams requires
// a Suspense boundary.

function TreePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── Mode sync (URL ↔ store) ────────────────────────────────────────
  const urlMode = searchParams.get("mode") as TraversalMode | null;
  const hasHydrated = useTraversalState((s) => s.hasHydrated);
  const storeMode = useTraversalState((s) => s.currentMode);
  const setStoreMode = useTraversalState((s) => s.setMode);
  const visitNode = useTraversalState((s) => s.visitNode);
  const contextWindow = useTraversalState((s) => s.contextWindow);
  const effectiveStoreMode = hasHydrated ? storeMode : "parse";
  const currentMode: TraversalMode =
    urlMode && ["lex", "parse", "eval"].includes(urlMode)
      ? urlMode
      : effectiveStoreMode;

  const handleModeChange = useCallback(
    (mode: TraversalMode) => {
      setStoreMode(mode);
      router.replace(`/tree?mode=${mode}`, { scroll: false });
    },
    [setStoreMode, router]
  );

  // ── Context window panel state ─────────────────────────────────────
  const [contextOpen, setContextOpen] = useState(false);
  const toggleContext = useCallback(() => setContextOpen((o) => !o), []);
  const closeContext = useCallback(() => setContextOpen(false), []);

  // ── Active slug ────────────────────────────────────────────────────
  // The most recently visited node is highlighted in the token stream.
  // Guard with hasHydrated to avoid SSR/client mismatch — contextWindow
  // is empty on the server but may contain entries after rehydration.
  const activeSlug =
    hasHydrated && contextWindow.length > 0
      ? contextWindow[contextWindow.length - 1].slug
      : null;

  // ── Share URL: restore visited nodes from query param ─────────────
  // If the URL has ?traversal=slug1,slug2,..., replay the visits.
  // This runs once after hydration — it's how "share traversal" works.
  // A ref guards against re-running if searchParams change after we strip
  // the traversal param from the URL.
  const hasRestoredTraversal = useRef(false);

  useEffect(() => {
    if (!hasHydrated || hasRestoredTraversal.current) return;
    const traversalParam = searchParams.get("traversal");
    if (!traversalParam) return;

    hasRestoredTraversal.current = true;

    // Strip the traversal param from the URL so it doesn't persist
    const params = new URLSearchParams(searchParams.toString());
    params.delete("traversal");
    const newUrl = params.toString() ? `/tree?${params.toString()}` : "/tree";
    router.replace(newUrl, { scroll: false });

    // Replay visits — resolve real labels, types, and colors from the AST
    const slugs = traversalParam.split(",").filter(Boolean);
    for (const slug of slugs) {
      const result = findNode(PORTFOLIO_AST, slug);
      if (result) {
        const { node } = result;
        visitNode(node.slug, node.label, node.type, node.glowColor);
      }
    }
  }, [hasHydrated, searchParams, router, visitNode]);

  return (
    <main className="flex flex-col h-screen overflow-hidden bg-ctp-base">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-ctp-surface0 bg-ctp-mantle/50 backdrop-blur-sm z-10 shrink-0">
        <Link
          href="/"
          className="text-ctp-overlay1 hover:text-ctp-text text-sm font-mono transition-colors"
        >
          {"<-"} root
        </Link>

        <TraversalModeSelector
          currentMode={currentMode}
          onModeChange={handleModeChange}
        />

        {/* Context window toggle */}
        <button
          onClick={toggleContext}
          className={cn(
            "text-xs font-mono px-3 py-1.5 rounded border transition-colors",
            contextOpen
              ? "border-ctp-lavender text-ctp-lavender bg-ctp-lavender/10"
              : "border-ctp-surface1 text-ctp-overlay1 hover:border-ctp-lavender hover:text-ctp-lavender"
          )}
          aria-pressed={contextOpen}
          aria-label={contextOpen ? "Close context window" : "Open context window"}
        >
          ctx
          {contextWindow.length > 0 && (
            <span className="ml-1.5 text-ctp-lavender">
              [{contextWindow.length}]
            </span>
          )}
        </button>
      </header>

      {/* ── Main area ───────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {/* AST Canvas — fills the space, shrinks when sidebar open */}
        <div
          className={cn(
            "absolute inset-0 transition-all duration-300",
            // On desktop, shrink canvas when sidebar is open
            "lg:right-0",
            contextOpen && "lg:right-72"
          )}
          // Reserve bottom space for token stream
          style={{ bottom: "40px" }}
        >
          <ASTCanvas mode={currentMode} />
        </div>

        {/* Context Window — sidebar on desktop */}
        <div
          className={cn(
            "hidden lg:block absolute right-0 top-0 bottom-10 z-30",
            contextOpen ? "pointer-events-auto" : "pointer-events-none"
          )}
        >
          <ContextWindow
            isOpen={contextOpen}
            onClose={closeContext}
            variant="sidebar"
          />
        </div>

        {/* Context Window — overlay on mobile/tablet */}
        <div
          className={cn(
            "lg:hidden absolute inset-0 z-30",
            contextOpen ? "pointer-events-auto" : "pointer-events-none"
          )}
        >
          <ContextWindow
            isOpen={contextOpen}
            onClose={closeContext}
            variant="overlay"
          />
        </div>

        {/* Token Stream — fixed at the bottom */}
        <TokenStream activeSlug={activeSlug} visible={true} />
      </div>
    </main>
  );
}

// ── Tree Page ──────────────────────────────────────────────────────────

export default function TreePage() {
  return (
    <Suspense
      fallback={
        <main className="flex items-center justify-center h-screen bg-ctp-base">
          <div className="text-ctp-overlay1 font-mono text-sm animate-pulse">
            loading AST...
          </div>
        </main>
      }
    >
      <TreePageInner />
    </Suspense>
  );
}
