"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ChromeInset } from "@tv/contract";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { ir } from "@/platform/ir";
import { TargetHost } from "@/platform/host/TargetHost";
import type { TargetId } from "@/platform/registry";
import { useShellStore } from "@/state/shell-store";
import { ContextWindow } from "@/chrome/ContextWindow";
import { TargetSwitcher } from "@/chrome/TargetSwitcher";

// ── /t/[target] frame ──────────────────────────────────────────────────
// The target fills the page. Shell chrome is overlaid on it: the home
// link and ctx toggle sit in the target's top row (the AST leaves
// same-sized stand-ins), and the context window opens below the
// target's header, whose height is the --tv-chrome-top token.

const SIDEBAR_WIDTH = 288; // w-72
const NO_INSET: ChromeInset = { top: 0, right: 0, bottom: 0, left: 0 };

export function TargetView({ targetId, children }: { targetId: TargetId; children: ReactNode }) {
  const search = useSearchParams();
  const isDesktop = useIsDesktop();
  const hasHydrated = useShellStore((s) => s.hasHydrated);
  const visitedCount = useShellStore((s) => s.visited.length);
  const [contextOpen, setContextOpen] = useState(false);

  const toggleContext = useCallback(() => setContextOpen((open) => !open), []);
  const closeContext = useCallback(() => setContextOpen(false), []);

  // Desktop: a sidebar over the right edge. Mobile: a sheet over everything.
  const inset = useMemo<ChromeInset>(() => {
    if (!contextOpen) return NO_INSET;
    return { ...NO_INSET, right: isDesktop ? SIDEBAR_WIDTH : window.innerWidth };
  }, [contextOpen, isDesktop]);

  // ── Share URL: restore visits from ?traversal=a,b,c ────────────────
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!hasHydrated || restoredRef.current) return;
    const shared = search.get("traversal");
    if (!shared) return;
    restoredRef.current = true;
    const next = new URLSearchParams(search.toString());
    next.delete("traversal");
    const query = next.toString();
    window.history.replaceState(null, "", query ? `/t/${targetId}?${query}` : `/t/${targetId}`);
    const { visit } = useShellStore.getState();
    for (const id of shared.split(",")) {
      const entity = ir.entity(id);
      if (entity) visit(entity);
    }
  }, [hasHydrated, search, targetId]);

  return (
    <main id="main-content" className="relative h-screen overflow-hidden" style={{ background: "var(--ink)" }}>
      <TargetHost targetId={targetId} inset={inset} onTargetFocus={closeContext}>
        {children}
      </TargetHost>

      {/* Top row: home link and ctx toggle */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-3">
        <Link
          href="/"
          style={{ fontSize: 12, color: "var(--text-faint)", fontFamily: "var(--mono)", transition: "color 150ms" }}
          className="pointer-events-auto hover:text-[var(--tv-text)]"
        >
          ← root
        </Link>
        <div className="pointer-events-auto flex items-center gap-2">
          <TargetSwitcher current={targetId} />
          <button
            type="button"
            onClick={toggleContext}
            className="tv-chip"
            data-on={contextOpen ? "true" : undefined}
            style={{ cursor: "pointer" }}
            aria-pressed={contextOpen}
            aria-label={contextOpen ? "Close context window" : "Open context window"}
          >
            ctx
            {visitedCount > 0 && <span style={{ color: "var(--accent)" }}>[{visitedCount}]</span>}
          </button>
        </div>
      </div>

      {/* Context window, below the target's header */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30" style={{ top: "var(--tv-chrome-top)" }}>
        <div
          className={cn(
            "hidden lg:block absolute right-0 top-0 bottom-10 z-30",
            contextOpen ? "pointer-events-auto" : "pointer-events-none"
          )}
        >
          <ContextWindow isOpen={contextOpen} onClose={closeContext} variant="sidebar" />
        </div>
        <div
          className={cn("lg:hidden absolute inset-0 z-30", contextOpen ? "pointer-events-auto" : "pointer-events-none")}
        >
          <ContextWindow isOpen={contextOpen} onClose={closeContext} variant="overlay" />
        </div>
      </div>
    </main>
  );
}
