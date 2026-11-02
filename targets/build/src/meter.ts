// ── Meter ──────────────────────────────────────────────────────────────
// The meta layer's numbers, all measured in the visitor's browser: what
// each step cost, the layout shift the page has had since mount, and the
// script this target shipped. Nothing here is estimated or hard-coded.

export interface Meter {
  /** Steps applied and their total cost in ms (style, layout, overlay). */
  readonly steps: number;
  readonly ms: number;
  record(ms: number): void;
  /** Cumulative layout shift since mount, or null where the browser does not report it. */
  shift(): number | null;
  /** Compressed bytes and file count of this target's scripts, or null if none are visible. */
  script(): { bytes: number; files: number } | null;
  /** ms from mount to the first frame, once known. */
  firstFrame: number | null;
  dispose(): void;
}

export function createMeter(base: string): Meter {
  let steps = 0;
  let ms = 0;
  let shift: number | null = null;
  let observer: PerformanceObserver | null = null;
  try {
    if (PerformanceObserver.supportedEntryTypes?.includes("layout-shift")) {
      shift = 0;
      observer = new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[])
          if (!e.hadRecentInput) shift = (shift ?? 0) + e.value;
      });
      observer.observe({ type: "layout-shift" });
    }
  } catch {
    shift = null;
  }

  return {
    get steps() {
      return steps;
    },
    get ms() {
      return ms;
    },
    record(t) {
      steps++;
      ms += t;
    },
    shift: () => shift,
    script() {
      const files = (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).filter(
        (e) => e.name.includes(base) && /\.m?js(\?|$)/.test(e.name),
      );
      if (!files.length) return null;
      // encodedBodySize is the compressed body; a memory-cache hit reports 0, so fall back to decoded.
      const bytes = files.reduce((n, e) => n + (e.encodedBodySize || e.decodedBodySize || 0), 0);
      return bytes ? { bytes, files: files.length } : null;
    },
    firstFrame: null,
    dispose() {
      observer?.disconnect();
    },
  };
}

/** "0.42 ms", "12 ms": two significant decimals only when small. */
export function ms(n: number): string {
  return `${n < 10 ? n.toFixed(2) : Math.round(n)} ms`;
}

/** "39.6 KB" */
export function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}
