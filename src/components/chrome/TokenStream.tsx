"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTraversalState } from "@/hooks/useTraversalState";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { getTokens } from "@/data";
import type { TokenStreamEntry } from "@/lib/ast-types";

// Lazy singleton — computed once on first access, cached for the process.
const TOKENS = getTokens();

// ── Props ──────────────────────────────────────────────────────────────

interface TokenStreamProps {
  /** Slug of the currently focused/active node, if any */
  activeSlug?: string | null;
  /** Whether the bar is visible */
  visible?: boolean;
}

// ── Token color map ────────────────────────────────────────────────────

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
      <span className="text-ctp-overlay0 select-none px-1.5 lg:px-1 shrink-0 text-sm lg:text-base">
        {token.value}
      </span>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={!isNavigable}
      className={cn(
        "relative flex flex-col items-start shrink-0 px-2.5 lg:px-2 py-1 lg:py-0.5 rounded",
        "transition-colors duration-150",
        isNavigable
          ? "cursor-pointer hover:bg-ctp-surface0 active:bg-ctp-surface0"
          : "cursor-default",
        isActive && "bg-ctp-surface0"
      )}
      whileHover={isNavigable ? { y: -1 } : {}}
      whileTap={isNavigable ? { scale: 0.97 } : {}}
      transition={{ duration: 0.1 }}
    >
      {/* Type label */}
      <span className="text-ctp-overlay0 text-[9px] leading-none font-mono select-none">
        {token.type}
      </span>

      {/* Token value */}
      <span
        className={cn(
          "text-xs font-mono font-medium leading-tight whitespace-nowrap",
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

// ── Drift Stream (mobile) ──────────────────────────────────────────────
// Replaces the old marquee with a physics-based drift. Uses rAF for
// smooth, variable-speed scrolling with opacity waves. No CSS animation,
// no duplicate children hack.

const DRIFT_SPEED = 0.3; // px per frame at 60fps

function DriftStream({
  children,
  activeIndex,
}: {
  children: React.ReactNode;
  activeIndex: number;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);
  const velocityRef = useRef(0);
  const lastTouchX = useRef(0);
  const lastTouchTime = useRef(0);
  const targetOffsetRef = useRef<number | null>(null);
  const [wavePhase, setWavePhase] = useState(0);

  // Animate the drift loop
  useEffect(() => {
    let lastTime = performance.now();

    function tick(now: number) {
      const dt = Math.min(now - lastTime, 32); // cap at ~30fps min
      lastTime = now;

      const inner = innerRef.current;
      const outer = outerRef.current;
      if (!inner || !outer) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const contentWidth = inner.scrollWidth / 2; // half because content is doubled
      const containerWidth = outer.offsetWidth;

      if (contentWidth <= 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      // If snapping to a target (active token changed)
      if (targetOffsetRef.current !== null && !isDragging.current) {
        const target = targetOffsetRef.current;
        const diff = target - offsetRef.current;

        // If close enough, snap and resume drift
        if (Math.abs(diff) < 0.5) {
          offsetRef.current = target;
          targetOffsetRef.current = null;
          velocityRef.current = 0;
        } else {
          // Ease toward target
          offsetRef.current += diff * 0.08;
        }
      } else if (isDragging.current) {
        // User is swiping — no auto-movement
      } else {
        // Apply residual velocity from fling
        if (Math.abs(velocityRef.current) > 0.1) {
          offsetRef.current += velocityRef.current * (dt / 16);
          velocityRef.current *= 0.95; // friction
        } else {
          // Default drift
          velocityRef.current = 0;
          offsetRef.current += DRIFT_SPEED * (dt / 16);
        }
      }

      // Wrap around seamlessly
      if (offsetRef.current >= contentWidth) {
        offsetRef.current -= contentWidth;
      } else if (offsetRef.current < 0) {
        offsetRef.current += contentWidth;
      }

      inner.style.transform = `translateX(${-offsetRef.current}px)`;

      // Update wave phase for opacity breathing (slow)
      setWavePhase((now / 2000) % (Math.PI * 2));

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // When activeIndex changes, snap to center it
  useEffect(() => {
    if (activeIndex < 0) return;
    const inner = innerRef.current;
    const outer = outerRef.current;
    if (!inner || !outer) return;

    // Find the active token element
    const tokenEls = inner.querySelectorAll("[data-token-idx]");
    const targetEl = tokenEls[activeIndex] as HTMLElement | undefined;
    if (!targetEl) return;

    const containerWidth = outer.offsetWidth;
    const tokenLeft = targetEl.offsetLeft;
    const tokenWidth = targetEl.offsetWidth;

    // Center the token
    targetOffsetRef.current = tokenLeft - containerWidth / 2 + tokenWidth / 2;
  }, [activeIndex]);

  // Touch handlers for swipe interaction
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    dragStartX.current = e.touches[0].clientX;
    dragStartOffset.current = offsetRef.current;
    lastTouchX.current = e.touches[0].clientX;
    lastTouchTime.current = performance.now();
    velocityRef.current = 0;
    targetOffsetRef.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const x = e.touches[0].clientX;
    const dx = dragStartX.current - x;
    offsetRef.current = dragStartOffset.current + dx;

    // Track velocity for fling
    const now = performance.now();
    const timeDelta = now - lastTouchTime.current;
    if (timeDelta > 0) {
      velocityRef.current = (lastTouchX.current - x) / timeDelta * 16;
    }
    lastTouchX.current = x;
    lastTouchTime.current = now;
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    // velocityRef already set — friction will decelerate
  }, []);

  // Mouse handlers for desktop hover-drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartOffset.current = offsetRef.current;
    lastTouchX.current = e.clientX;
    lastTouchTime.current = performance.now();
    velocityRef.current = 0;
    targetOffsetRef.current = null;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const x = e.clientX;
    const dx = dragStartX.current - x;
    offsetRef.current = dragStartOffset.current + dx;

    const now = performance.now();
    const timeDelta = now - lastTouchTime.current;
    if (timeDelta > 0) {
      velocityRef.current = (lastTouchX.current - x) / timeDelta * 16;
    }
    lastTouchX.current = x;
    lastTouchTime.current = now;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={outerRef}
      className="h-full flex items-center overflow-hidden cursor-grab active:cursor-grabbing"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={
        {
          "--wave-phase": wavePhase,
        } as React.CSSProperties
      }
    >
      <div
        ref={innerRef}
        className="flex items-center gap-0.5 will-change-transform"
      >
        {/* First copy */}
        <div className="flex items-center gap-0.5 shrink-0 pr-8">
          {children}
        </div>
        {/* Second copy — seamless wrapping */}
        <div className="flex items-center gap-0.5 shrink-0 pr-8" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── TokenStream ────────────────────────────────────────────────────────

export function TokenStream({ activeSlug, visible = true }: TokenStreamProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTokenRef = useRef<HTMLDivElement>(null);
  const isVisited = useTraversalState((s) => s.isVisited);
  const hasHydrated = useTraversalState((s) => s.hasHydrated);
  const isDesktop = useIsDesktop();

  // Find active token index for drift stream
  const activeIndex = TOKENS.findIndex(
    (t) => t.slug && t.slug === activeSlug
  );

  // Desktop: scroll to active token whenever activeSlug changes
  useEffect(() => {
    if (!isDesktop) return;
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
  }, [activeSlug, isDesktop]);

  const handleTokenClick = useCallback(
    (slug: string) => {
      router.push(`/node/${slug}`);
    },
    [router]
  );

  // Shared token rendering
  const tokenElements = TOKENS.map((token, idx) => {
    const isActive = !!(token.slug && token.slug === activeSlug);
    const visited = !!(hasHydrated && token.slug && isVisited(token.slug));

    return (
      <div
        key={`${token.type}-${token.value}-${idx}`}
        ref={isDesktop && isActive ? activeTokenRef : null}
        data-token-idx={idx}
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
  });

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="token-stream"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-ctp-mantle border-t border-ctp-surface0 z-20",
            // Taller on mobile for touch targets + readability
            "h-12 lg:h-10"
          )}
          role="navigation"
          aria-label="Career token stream"
        >
          {/* Fade gradients on edges */}
          <div className="absolute left-0 top-0 bottom-0 w-6 lg:w-8 bg-gradient-to-r from-ctp-mantle to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-6 lg:w-8 bg-gradient-to-l from-ctp-mantle to-transparent z-10 pointer-events-none" />

          {isDesktop ? (
            /* ── Desktop: scrollable container ───────────────────── */
            <div
              ref={scrollRef}
              className="h-full flex items-center gap-0.5 px-6 overflow-x-auto scrollbar-hidden"
            >
              <span className="text-ctp-overlay0 text-[10px] font-mono shrink-0 mr-2 select-none">
                STREAM
              </span>
              {tokenElements}
            </div>
          ) : (
            /* ── Mobile: physics-based drift stream ─────────────── */
            <DriftStream activeIndex={activeIndex}>
              <span className="text-ctp-overlay0 text-[10px] font-mono shrink-0 mr-2 select-none">
                STREAM
              </span>
              {tokenElements}
            </DriftStream>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
