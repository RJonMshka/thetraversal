"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { ASTCanvasLazy } from "@/components/ast/ASTCanvasLazy";
import { ASTMobileTree } from "@/components/ast/ASTMobileTree";
import { TraversalModeSelector } from "@/components/ast/TraversalModeSelector";
import { TokenStream } from "@/components/chrome/TokenStream";
import { ContextWindow } from "@/components/chrome/ContextWindow";
import { useTraversalState } from "@/hooks/useTraversalState";

import { getAST, findNodeBySlug } from "@/data";
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

  // Resolve mode: URL param wins, then hydrated store, then fallback.
  // Before hydration, use "parse" as the stable default (matches SSR).
  const validUrlMode =
    urlMode && ["lex", "parse", "eval"].includes(urlMode) ? urlMode : null;
  const effectiveStoreMode = hasHydrated ? storeMode : "parse";
  const currentMode: TraversalMode = validUrlMode ?? effectiveStoreMode;

  // After hydration, if no URL mode was specified and the store has a
  // different mode from the fallback, sync the URL to the store's mode.
  // This prevents the flash where the selector briefly shows "parse"
  // before switching to the hydrated "eval" (or vice versa).
  const hasSyncedMode = useRef(false);
  useEffect(() => {
    if (!hasHydrated || hasSyncedMode.current) return;
    hasSyncedMode.current = true;
    if (!validUrlMode && storeMode !== "parse") {
      router.replace(`/tree?mode=${storeMode}`, { scroll: false });
    }
  }, [hasHydrated, validUrlMode, storeMode, router]);

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
      const result = findNodeBySlug(slug);
      if (result) {
        const { node } = result;
        visitNode(node.slug, node.label, node.type, node.glowColor);
      }
    }
  }, [hasHydrated, searchParams, router, visitNode]);

  return (
    <main id="main-content" className="flex flex-col h-screen overflow-hidden bg-ctp-base">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="border-b border-ctp-surface0 bg-ctp-mantle/50 backdrop-blur-sm z-10 shrink-0">
        {/* Row 1: Navigation + context toggle */}
        <div className="flex items-center justify-between px-4 py-2.5 lg:py-3">
          <Link
            href="/"
            className="text-ctp-overlay1 hover:text-ctp-text text-sm font-mono transition-colors"
          >
            {"<-"} root
          </Link>

          {/* Desktop: full mode selector inline — invisible until
              hydration to prevent flash if stored mode differs from default */}
          <div className={cn("hidden lg:block transition-opacity duration-150", hasHydrated ? "opacity-100" : "opacity-0")}>
            <TraversalModeSelector
              currentMode={currentMode}
              onModeChange={handleModeChange}
            />
          </div>

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
        </div>

        {/* Row 2 (mobile only): Compact mode selector, centered */}
        <div className={cn("flex items-center justify-center px-4 pb-2.5 lg:hidden transition-opacity duration-150", hasHydrated ? "opacity-100" : "opacity-0")}>
          <div className="flex items-center gap-1 bg-ctp-surface0/40 rounded-lg px-1 py-0.5">
            <span className="text-ctp-green text-xs font-mono select-none mr-0.5">$</span>
            <TraversalModeSelector
              currentMode={currentMode}
              onModeChange={handleModeChange}
              compact
            />
          </div>
        </div>
      </header>

      {/* ── Main area ───────────────────────────────────────────────── */}
      {/* Both desktop and mobile trees are always in the DOM.
          CSS (hidden/block via Tailwind breakpoints) controls which is
          visible. This eliminates the flash where useMediaQuery starts
          as false → mobile tree renders for one frame on desktop. */}
      <div className="flex-1 relative overflow-hidden">
        {/* ── Desktop: AST Canvas ─────────────────────────────────── */}
        <div
          className={cn(
            "hidden lg:block absolute inset-0 transition-all duration-300",
            contextOpen && "lg:right-72"
          )}
          style={{ bottom: "40px" }}
        >
          <ASTCanvasLazy mode={currentMode} />
        </div>

        {/* ── Desktop: Context Window sidebar ─────────────────────── */}
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

        {/* ── Mobile: AST Mobile Tree ─────────────────────────────── */}
        <div
          className="lg:hidden absolute inset-0 overflow-y-auto"
          style={{ bottom: "48px" }}
        >
          <ASTMobileTree ast={getAST()} mode={currentMode} />
        </div>

        {/* ── Mobile: Context Window overlay ──────────────────────── */}
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
