"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ASTCanvasLazy } from "@/targets/ast/components/ASTCanvasLazy";
import { ASTMobileTree } from "@/targets/ast/components/ASTMobileTree";
import { ASTLexView } from "@/targets/ast/components/ASTLexView";
import { ASTEvalView } from "@/targets/ast/components/ASTEvalView";
import { TraversalModeSelector } from "@/targets/ast/components/TraversalModeSelector";
import { NodeInspector } from "@/targets/ast/components/NodeInspector";
import { TokenStream } from "@/targets/ast/components/TokenStream";
import { ContextWindow } from "@/components/chrome/ContextWindow";
import { useTraversalState } from "@/hooks/useTraversalState";

import { getAST, findNodeBySlug } from "@/data";
import { cn } from "@/lib/utils";
import type { TraversalMode } from "@/targets/ast/lib/ast-types";

// ── AstApp ─────────────────────────────────────────────────────────────
// The AST target's whole surface: header, mode views, inspector, token
// stream. Rendered by /tree until it mounts through the target contract.

export function AstApp() {
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
  const hasSyncedMode = useRef(false);
  useEffect(() => {
    if (!hasHydrated || hasSyncedMode.current) return;
    hasSyncedMode.current = true;
    if (!validUrlMode && storeMode !== "parse") {
      router.replace(`/tree?mode=${storeMode}`, { scroll: false });
    }
  }, [hasHydrated, validUrlMode, storeMode, router]);

  const [selectedNodeSlug, setSelectedNodeSlug] = useState<string | null>(null);

  const handleModeChange = useCallback(
    (mode: TraversalMode) => {
      setStoreMode(mode);
      router.replace(`/tree?mode=${mode}`, { scroll: false });
      // Close node inspector when leaving parse mode (it's parse-only)
      if (mode !== "parse") {
        setSelectedNodeSlug(null);
      }
    },
    [setStoreMode, router]
  );

  // ── Context window panel state ─────────────────────────────────────
  const [contextOpen, setContextOpen] = useState(false);
  const toggleContext = useCallback(() => {
    setContextOpen((o) => !o);
    setSelectedNodeSlug(null);
  }, []);
  const closeContext = useCallback(() => setContextOpen(false), []);

  // ── Node inspector state ───────────────────────────────────────────
  const handleNodeSelect = useCallback((slug: string | null) => {
    setSelectedNodeSlug(slug);
    if (slug) setContextOpen(false);
  }, []);

  // ── Active slug ────────────────────────────────────────────────────
  const activeSlug =
    hasHydrated && contextWindow.length > 0
      ? contextWindow[contextWindow.length - 1].slug
      : null;

  // ── Share URL: restore visited nodes from query param ─────────────
  const hasRestoredTraversal = useRef(false);

  useEffect(() => {
    if (!hasHydrated || hasRestoredTraversal.current) return;
    const traversalParam = searchParams.get("traversal");
    if (!traversalParam) return;

    hasRestoredTraversal.current = true;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("traversal");
    const newUrl = params.toString() ? `/tree?${params.toString()}` : "/tree";
    router.replace(newUrl, { scroll: false });

    const slugs = traversalParam.split(",").filter(Boolean);
    for (const slug of slugs) {
      const result = findNodeBySlug(slug);
      if (result) {
        const { node } = result;
        visitNode(node.slug, node.label, node.type, node.glowColor);
      }
    }
  }, [hasHydrated, searchParams, router, visitNode]);

  const modeSubtitle: Record<string, string> = {
    lex:   "words · the portfolio as a stream of tokens",
    parse: "structure · click any branch to dive in",
    eval:  "story · the rendered output a reader sees",
  };

  const isParseMode = currentMode === "parse";
  const isLexMode   = currentMode === "lex";

  return (
    <main
      id="main-content"
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: "var(--ink)" }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header
        className="z-10 shrink-0"
        style={{ borderBottom: "1px solid var(--line)", background: "color-mix(in srgb, var(--ink) 88%, transparent)", backdropFilter: "blur(8px)" }}
      >
        {/* Row 1: Navigation + mode selector + ctx toggle */}
        <div className="flex items-center justify-between px-5 py-3">
          <Link
            href="/"
            style={{ fontSize: 12, color: "var(--text-faint)", fontFamily: "var(--mono)", transition: "color 150ms" }}
            className="hover:text-[var(--tv-text)]"
          >
            ← root
          </Link>

          {/* Desktop: full mode selector inline */}
          <div className={cn("hidden lg:block transition-opacity duration-150", hasHydrated ? "opacity-100" : "opacity-0")}>
            <TraversalModeSelector
              currentMode={currentMode}
              onModeChange={handleModeChange}
            />
          </div>

          {/* Context window toggle — only meaningful in parse mode */}
          <button
            onClick={toggleContext}
            className="tv-chip"
            data-on={contextOpen ? "true" : undefined}
            style={{ cursor: "pointer" }}
            aria-pressed={contextOpen}
            aria-label={contextOpen ? "Close context window" : "Open context window"}
          >
            ctx
            {contextWindow.length > 0 && (
              <span style={{ color: "var(--accent)" }}>
                [{contextWindow.length}]
              </span>
            )}
          </button>
        </div>

        {/* Row 2 (mobile only): Compact mode selector */}
        <div className={cn("flex items-center justify-center px-4 pb-2.5 lg:hidden transition-opacity duration-150", hasHydrated ? "opacity-100" : "opacity-0")}>
          <TraversalModeSelector
            currentMode={currentMode}
            onModeChange={handleModeChange}
            compact
          />
        </div>

        {/* Subtitle band — plain-language mode description */}
        <div
          className="hidden lg:flex items-center justify-center"
          style={{ height: 34, borderTop: "1px solid var(--line)", background: "rgba(11,13,16,0.4)" }}
        >
          <div style={{ fontSize: 11, color: "var(--text-faint)", letterSpacing: "0.04em", fontFamily: "var(--mono)" }}>
            <span style={{ color: "var(--accent)", marginRight: 6 }}>›</span>
            {modeSubtitle[currentMode]}
          </div>
        </div>
      </header>

      {/* ── Main area ───────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Line grid — always behind canvas in parse mode, subtle in others */}
        <div
          className="tv-linegrid absolute inset-0 pointer-events-none"
          style={{ opacity: isParseMode ? 0.5 : 0.25 }}
        />

        {/* ── Desktop: Parse mode — D3 tree canvas + node inspector ── */}
        {isParseMode && (
          <>
            <div
              className={cn(
                "hidden lg:block absolute inset-0 transition-all duration-300",
                (contextOpen || !!selectedNodeSlug) && "lg:right-72"
              )}
              style={{ bottom: "40px" }}
            >
              <ASTCanvasLazy mode={currentMode} onNodeSelect={handleNodeSelect} />
            </div>

            <div
              className={cn(
                "hidden lg:block absolute right-0 top-0 bottom-10 z-25",
                selectedNodeSlug ? "pointer-events-auto" : "pointer-events-none"
              )}
            >
              <NodeInspector
                slug={selectedNodeSlug}
                onClose={() => setSelectedNodeSlug(null)}
              />
            </div>
          </>
        )}

        {/* ── Desktop: Context window — available in ALL modes ─────── */}
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

        {/* ── Desktop: Lex mode — token ribbon ────────────────────── */}
        {isLexMode && (
          <div
            className="hidden lg:block absolute inset-0 overflow-y-auto"
            style={{ bottom: "40px" }}
          >
            <ASTLexView />
          </div>
        )}

        {/* ── Desktop: Eval mode — card grid ──────────────────────── */}
        {!isParseMode && !isLexMode && (
          <div
            className="hidden lg:block absolute inset-0 overflow-y-auto"
            style={{ bottom: "40px" }}
          >
            <ASTEvalView />
          </div>
        )}

        {/* ── Mobile: mode-routed views ────────────────────────────── */}
        <div
          className="lg:hidden absolute inset-0 overflow-y-auto"
          style={{ bottom: "48px" }}
        >
          {isParseMode && <ASTMobileTree ast={getAST()} mode={currentMode} />}
          {isLexMode   && <ASTLexView />}
          {!isParseMode && !isLexMode && <ASTEvalView />}
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
