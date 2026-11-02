import { Outline } from "@/chrome/Outline";

// ── Outline gate (LLD-03 §9) ───────────────────────────────────────────
// The outline is always in the HTML (crawlers, no-JS visitors, the last
// fallback), but a visitor with JS sees a quiet loading line while the
// target loads, not a flash of the whole portfolio as a list. CSS alone
// decides, so it holds before hydration and under the strict CSP:
// - JS on: the outline reveals itself after 4 s if the target is still not
//   ready (a stalled load reads as content, never as a blank page);
// - target error: the host sets data-target-state="error", outline at once;
// - no JS: the <noscript> style shows the outline immediately.

const REVEAL_NOW = "[data-outline-gate] .tv-gate-outline{visibility:visible;animation:none}[data-outline-gate] .tv-gate-loading{display:none}";

export function OutlineGate({ targetId }: { targetId: string }) {
  return (
    <div data-outline-gate className="relative min-h-full">
      <p role="status" className="tv-gate-loading">
        <span className="sr-only">Loading </span>
        <span aria-hidden="true" className="text-[var(--text-faint)]">
          loading{" "}
        </span>
        <span className="text-[var(--accent)]">--target={targetId}</span>
        <span aria-hidden="true" className="tv-caret-thin" />
      </p>
      <div className="tv-gate-outline">
        <Outline />
      </div>
      <noscript>
        <style>{REVEAL_NOW}</style>
      </noscript>
    </div>
  );
}
