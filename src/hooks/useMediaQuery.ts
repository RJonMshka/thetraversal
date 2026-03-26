import { useSyncExternalStore, useCallback } from "react";

// ── useMediaQuery ──────────────────────────────────────────────────────
// Reactive media query hook using useSyncExternalStore for tear-free,
// flash-free reads. The browser evaluates the query synchronously during
// the first client render, eliminating the false → true flash that caused
// the mobile tree to appear briefly on desktop.

export function useMediaQuery(query: string): boolean {
  // Subscribe to media query changes
  const subscribe = useCallback(
    (callback: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    [query]
  );

  // Read current value — called synchronously during render on the client
  const getSnapshot = useCallback(() => {
    return window.matchMedia(query).matches;
  }, [query]);

  // SSR fallback — always false (no window). The first client render
  // will immediately get the correct value from getSnapshot.
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ── Convenience hooks ──────────────────────────────────────────────────
// Tailwind v4 default breakpoints.

/** True when viewport is >= 1024px (lg breakpoint) */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

/** True when viewport is < 1024px */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 1023px)");
}
