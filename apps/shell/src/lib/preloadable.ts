import { lazy, useEffect, type ComponentType } from "react";

// ── Lazy components that can be warmed up ──────────────────────────────
// For chrome that renders nothing until the visitor does something (the
// context window, the landing parse animation, the easter eggs). Their
// code, Framer Motion included, stays out of first-load JS and is
// fetched when the browser is idle, so the first use does not wait.

export interface Preloadable<P extends object> {
  Component: ComponentType<P>;
  preload: () => Promise<ComponentType<P>>;
}

export function preloadable<P extends object>(load: () => Promise<ComponentType<P>>): Preloadable<P> {
  let pending: Promise<ComponentType<P>> | null = null;
  const preload = () => {
    pending ??= load().catch((err: unknown) => {
      // Forget a failed request so the next attempt fetches again.
      pending = null;
      throw err;
    });
    return pending;
  };
  const Component = lazy(() => preload().then((C) => ({ default: C })));
  return { Component, preload };
}

/** Preloads once the page is idle (after hydration and first paint). */
export function usePreloadWhenIdle(...preloads: (() => Promise<unknown>)[]): void {
  useEffect(() => {
    const run = () => {
      for (const preload of preloads) preload().catch(() => {});
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, 1500);
    return () => window.clearTimeout(id);
    // The preload functions are module-level constants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
