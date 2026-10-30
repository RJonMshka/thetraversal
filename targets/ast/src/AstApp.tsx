import { ASTCanvasLazy } from "@/components/ASTCanvasLazy";
import { ASTMobileTree } from "@/components/ASTMobileTree";
import { ASTLexView } from "@/components/ASTLexView";
import { ASTEvalView } from "@/components/ASTEvalView";
import { TraversalModeSelector } from "@/components/TraversalModeSelector";
import { NodeInspector } from "@/components/NodeInspector";
import { TokenStream } from "@/components/TokenStream";
import { useAstData } from "@/data";
import { useAst } from "@/store";
import { cn } from "@/lib/cn";

// ── AstApp ─────────────────────────────────────────────────────────────
// The AST target's whole surface: header, mode views, inspector, token
// stream. Mounted into a shadow root by mount.tsx.
//
// Shell chrome (the "← root" link, the ctx toggle and the context window)
// is overlaid by the shell. The header keeps invisible stand-ins of the
// same size so the mode selector stays centered, and its height is the
// shared --tv-chrome-top token the shell positions its panels against.

export function AstApp() {
  const { ast } = useAstData();
  const currentMode = useAst((s) => s.mode);
  const setMode = useAst((s) => s.setMode);
  const selectedNodeSlug = useAst((s) => s.selected);
  const select = useAst((s) => s.select);
  const activeSlug = useAst((s) => s.focus);
  const visitedCount = useAst((s) => s.visited.length);
  const chromeCoversRight = useAst((s) => s.inset.right > 0);

  const modeSubtitle: Record<string, string> = {
    lex:   "words · the portfolio as a stream of tokens",
    parse: "structure · click any branch to dive in",
    eval:  "story · the rendered output a reader sees",
  };

  const isParseMode = currentMode === "parse";
  const isLexMode   = currentMode === "lex";

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: "var(--ink)" }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header
        className="z-10 shrink-0"
        style={{ height: "var(--tv-chrome-top)", borderBottom: "1px solid var(--line)", background: "color-mix(in srgb, var(--ink) 88%, transparent)", backdropFilter: "blur(8px)" }}
      >
        {/* Row 1: home (shell) + mode selector + ctx toggle (shell) */}
        <div className="flex items-center justify-between px-5 py-3">
          <span
            aria-hidden
            className="invisible"
            style={{ fontSize: 12, fontFamily: "var(--mono)" }}
          >
            ← root
          </span>

          {/* Desktop: full mode selector inline */}
          <div className={cn("hidden lg:block transition-opacity duration-150", "opacity-100")}>
            <TraversalModeSelector
              currentMode={currentMode}
              onModeChange={setMode}
            />
          </div>

          {/* Stand-in for the shell's ctx toggle */}
          <span aria-hidden className="tv-chip invisible">
            ctx
            {visitedCount > 0 && <span>[{visitedCount}]</span>}
          </span>
        </div>

        {/* Row 2 (mobile only): Compact mode selector */}
        <div className={cn("flex items-center justify-center px-4 pb-2.5 lg:hidden transition-opacity duration-150", "opacity-100")}>
          <TraversalModeSelector
            currentMode={currentMode}
            onModeChange={setMode}
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
                (chromeCoversRight || !!selectedNodeSlug) && "lg:right-72"
              )}
              style={{ bottom: "40px" }}
            >
              <ASTCanvasLazy mode={currentMode} onNodeSelect={select} />
            </div>

            <div
              className={cn(
                "hidden lg:block absolute right-0 top-0 bottom-10 z-25",
                selectedNodeSlug ? "pointer-events-auto" : "pointer-events-none"
              )}
            >
              <NodeInspector
                slug={selectedNodeSlug}
                onClose={() => select(null)}
              />
            </div>
          </>
        )}

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
          {isParseMode && <ASTMobileTree ast={ast} mode={currentMode} />}
          {isLexMode   && <ASTLexView />}
          {!isParseMode && !isLexMode && <ASTEvalView />}
        </div>

        {/* Token Stream — fixed at the bottom */}
        <TokenStream activeSlug={activeSlug} visible={true} />
      </div>
    </div>
  );
}
