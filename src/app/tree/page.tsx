"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, Suspense } from "react";
import Link from "next/link";
import { ASTCanvas } from "@/components/ast/ASTCanvas";
import { TraversalModeSelector } from "@/components/ast/TraversalModeSelector";
import { useTraversalState } from "@/hooks/useTraversalState";
import type { TraversalMode } from "@/lib/ast-types";

// ── Tree Page Inner ────────────────────────────────────────────────────
// Extracted to a separate component because useSearchParams requires
// a Suspense boundary.

function TreePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read mode from URL, fall back to store, fall back to "parse".
  // Gate store mode behind hasHydrated to prevent SSR mismatch —
  // before hydration, use "parse" default (same as server).
  const urlMode = searchParams.get("mode") as TraversalMode | null;
  const hasHydrated = useTraversalState((s) => s.hasHydrated);
  const storeMode = useTraversalState((s) => s.currentMode);
  const setStoreMode = useTraversalState((s) => s.setMode);
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

  return (
    <main className="flex flex-col h-screen overflow-hidden bg-ctp-base">
      {/* Top bar: back link + mode selector */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-ctp-surface0 bg-ctp-mantle/50 backdrop-blur-sm z-10">
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

        {/* Placeholder for context window toggle (Phase 5) */}
        <div className="text-ctp-overlay0 text-xs font-mono">
          {/* Context window will go here */}
        </div>
      </header>

      {/* Main canvas area */}
      <div className="flex-1 relative overflow-hidden">
        {/* AST Canvas takes full remaining height */}
        <ASTCanvas mode={currentMode} />

        {/* Token stream placeholder (Phase 5) */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-ctp-mantle/80 backdrop-blur-sm border-t border-ctp-surface0 flex items-center px-4">
          <span className="text-ctp-overlay0 text-xs font-mono">
            {"// token stream (Phase 5)"}
          </span>
        </div>
      </div>
    </main>
  );
}

// ── Tree Page ──────────────────────────────────────────────────────────
// Wraps TreePageInner in Suspense for useSearchParams.

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
