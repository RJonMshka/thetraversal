import { useCallback, useSyncExternalStore } from "react";

// ── useIsDesktop ───────────────────────────────────────────────────────
// True at the lg breakpoint (>= 1024px). The AST's own copy of the shell
// hook; the listener is removed when the component unmounts.

const QUERY = "(min-width: 1024px)";

export function useIsDesktop(): boolean {
  const subscribe = useCallback((callback: () => void) => {
    const mql = window.matchMedia(QUERY);
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
  }, []);
  const getSnapshot = useCallback(() => window.matchMedia(QUERY).matches, []);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
