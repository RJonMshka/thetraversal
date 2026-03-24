import { useState, useEffect } from "react";

// ── useMediaQuery ──────────────────────────────────────────────────────
// Reactive media query hook. Returns true when the query matches.
// SSR-safe: returns false on the server, hydrates on the client.

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    function handleChange(e: MediaQueryListEvent) {
      setMatches(e.matches);
    }

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
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
