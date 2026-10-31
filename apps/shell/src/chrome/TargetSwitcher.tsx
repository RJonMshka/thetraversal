"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FOCUS_PARAM, targetHref } from "@/platform/focus";
import { prefetchTarget } from "@/platform/prefetch";
import { TARGETS, type TargetId } from "@/platform/registry";

// ── Target switcher (LLD-03 §12) ───────────────────────────────────────
// `--target=<id>` chips, the visual sibling of the AST mode selector.
// Hidden while only one target is registered. Hover, keyboard focus or a
// touch on a chip prefetches that target's code (LLD-03 §11), so the
// switch only has to mount it.

/** `compact` shows the id alone (the narrow entity-list column). */
export function TargetSwitcher({ current, compact = false }: { current: TargetId; compact?: boolean }) {
  const search = useSearchParams();
  if (TARGETS.length < 2) return null;
  const focus = search.get(FOCUS_PARAM);

  return (
    <nav aria-label="Rendering target" className="flex items-center gap-2 font-mono">
      {TARGETS.map(({ id }) => (
        <Link
          key={id}
          href={targetHref(id, { focus })}
          className="tv-chip"
          data-on={id === current ? "true" : undefined}
          aria-current={id === current ? "page" : undefined}
          onPointerEnter={() => id !== current && prefetchTarget(id)}
          onFocus={() => id !== current && prefetchTarget(id)}
        >
          {/* Phones show the id alone so the top row fits beside ← root and ctx. */}
          {!compact && <span className="hidden sm:inline">--target=</span>}
          {id}
        </Link>
      ))}
    </nav>
  );
}
