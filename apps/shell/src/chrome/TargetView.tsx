"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ChromeInset, TargetManifest } from "@tv/contract";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { ir } from "@/platform/ir";
import { TargetHost } from "@/platform/host/TargetHost";
import { FOCUS_PARAM, pickParams, resolveFocus, targetHref } from "@/platform/focus";
import { loader } from "@/platform/loader";
import { prefetchManifests } from "@/platform/prefetch";
import { TARGETS, type TargetId } from "@/platform/registry";
import { useShellStore } from "@/state/shell-store";
import { preloadable, usePreloadWhenIdle } from "@/lib/preloadable";
import { TargetSwitcher } from "@/chrome/TargetSwitcher";

// ── /t/[target] frame ──────────────────────────────────────────────────
// The target fills the page. Shell chrome is overlaid on it: the home
// link, target switcher and ctx toggle sit in the target's top row (the
// AST leaves same-sized stand-ins), and the context window opens below
// the target's header, whose height is the --tv-chrome-top token.
// Targets that are not fully accessible on their own (manifest a11y
// "partial" or "decorative") get the accessible entity list beside them:
// a right-hand column on desktop, below a shorter stage on phones. On
// desktop the switcher and ctx toggle move into that column's header, so
// they never sit on top of the list or the target.

const SIDEBAR_WIDTH = 288; // w-72

// Renders nothing until opened; its code (and Framer Motion) loads when
// the page is idle, so it is not first-load JS.
const ContextWindowLazy = preloadable(() => import("@/chrome/ContextWindow").then((m) => m.ContextWindow));
const ContextWindow = ContextWindowLazy.Component;
// Only targets that need it load the list. It is rendered from the
// resolved module rather than through lazy() + Suspense, whose reveal
// React throttles by ~300 ms: the list would land well after the target.
type EntityListProps = ComponentProps<typeof import("@/chrome/AccessibleEntityList").AccessibleEntityList>;
const EntityListLazy = preloadable(() => import("@/chrome/AccessibleEntityList").then((m) => m.AccessibleEntityList));
const NO_INSET: ChromeInset = { top: 0, right: 0, bottom: 0, left: 0 };

export function TargetView({ targetId, children }: { targetId: TargetId; children: ReactNode }) {
  const search = useSearchParams();
  const isDesktop = useIsDesktop();
  const hasHydrated = useShellStore((s) => s.hasHydrated);
  const visitedCount = useShellStore((s) => s.visited.length);
  const [contextOpen, setContextOpen] = useState(false);
  // Once opened, the panel stays mounted so its exit animation can run.
  const [contextSeen, setContextSeen] = useState(false);
  if (contextOpen && !contextSeen) setContextSeen(true);
  usePreloadWhenIdle(ContextWindowLazy.preload, EntityListLazy.preload);
  useEffect(() => prefetchManifests(TARGETS.map((t) => t.id)), []);
  // /node pages link back to the target the visitor came from.
  useEffect(() => useShellStore.getState().setLastTarget(targetId), [targetId]);

  // The manifest is cached by the loader (TargetHost reads the same one),
  // so the layout knows the target's a11y mode before its code arrives.
  const [loaded, setLoaded] = useState<TargetManifest | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    loader.manifest(targetId, abort.signal).then(setLoaded, () => {});
    return () => abort.abort();
  }, [targetId]);
  const manifest = loaded?.id === targetId ? loaded : null;
  const withList = manifest !== null && manifest.a11y !== "full";
  const [EntityList, setEntityList] = useState<ComponentType<EntityListProps> | null>(null);
  useEffect(() => {
    if (!withList || EntityList) return;
    EntityListLazy.preload().then((C) => setEntityList(() => C), () => {});
  }, [withList, EntityList]);

  const chromeFocusRef = useRef<((id: string) => void) | null>(null);
  const listFocus = resolveFocus(search.get(FOCUS_PARAM), ir);
  const focusFromList = useCallback(
    (id: string) => {
      if (chromeFocusRef.current) return chromeFocusRef.current(id);
      // Target not mounted (loading or failed): the URL still records it,
      // and a target that mounts later starts there.
      const params = pickParams(new URLSearchParams(window.location.search), manifest?.urlParams ?? []);
      window.history.replaceState(null, "", targetHref(targetId, { params, focus: id }));
    },
    [manifest, targetId]
  );

  const toggleContext = useCallback(() => setContextOpen((open) => !open), []);
  const controls = (compact: boolean) => (
    <>
      <TargetSwitcher current={targetId} compact={compact} />
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
    </>
  );
  const closeContext = useCallback(() => setContextOpen(false), []);

  // Desktop: a sidebar over the right edge (over the entity list when there
  // is one, so the target is not covered). Mobile: a sheet over everything.
  const inset = useMemo<ChromeInset>(() => {
    if (!contextOpen || (isDesktop && withList)) return NO_INSET;
    return { ...NO_INSET, right: isDesktop ? SIDEBAR_WIDTH : window.innerWidth };
  }, [contextOpen, isDesktop, withList]);

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
    <main
      id="main-content"
      className={cn(
        "relative bg-[var(--ink)]",
        withList ? "flex min-h-screen flex-col lg:h-screen lg:flex-row lg:overflow-hidden" : "h-screen overflow-hidden"
      )}
    >
      <div className={cn("relative", withList ? "h-[55vh] min-h-80 shrink-0 lg:h-full lg:min-w-0 lg:flex-1" : "h-full")}>
        <TargetHost targetId={targetId} inset={inset} onTargetFocus={closeContext} chromeFocusRef={chromeFocusRef}>
          {children}
        </TargetHost>
      </div>
      {withList && (
        <div className="flex min-h-0 flex-col border-t border-[var(--line-2)] lg:w-72 lg:shrink-0 lg:border-l lg:border-t-0">
          {/* Desktop: the column's own header row holds the switcher and ctx. */}
          <div className="hidden h-12 shrink-0 items-center justify-end gap-2 px-3.5 lg:flex">{controls(true)}</div>
          {EntityList && <EntityList focus={listFocus} onFocus={focusFromList} className="min-h-0 flex-1" />}
        </div>
      )}

      {/* Top row: home link, switcher and ctx toggle (in the list column on desktop) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-3">
        <Link
          href="/"
          style={{ fontSize: 12, color: "var(--text-faint)", fontFamily: "var(--mono)", transition: "color 150ms" }}
          className="pointer-events-auto whitespace-nowrap hover:text-[var(--tv-text)]"
        >
          ← root
        </Link>
        <div className={cn("pointer-events-auto flex items-center gap-2", withList && "lg:hidden")}>{controls(false)}</div>
      </div>

      {/* Context window, below the target's header */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30" style={{ top: "var(--tv-chrome-top)" }}>
        <div
          className={cn(
            "hidden lg:block absolute right-0 top-0 bottom-10 z-30",
            contextOpen ? "pointer-events-auto" : "pointer-events-none"
          )}
        >
          {contextSeen && (
            <Suspense fallback={null}>
              <ContextWindow isOpen={contextOpen} onClose={closeContext} variant="sidebar" />
            </Suspense>
          )}
        </div>
        <div
          className={cn("lg:hidden absolute inset-0 z-30", contextOpen ? "pointer-events-auto" : "pointer-events-none")}
        >
          {contextSeen && (
            <Suspense fallback={null}>
              <ContextWindow isOpen={contextOpen} onClose={closeContext} variant="overlay" />
            </Suspense>
          )}
        </div>
      </div>
    </main>
  );
}
