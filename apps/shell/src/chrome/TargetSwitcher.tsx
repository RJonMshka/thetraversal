"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FOCUS_PARAM, targetHref } from "@/platform/focus";
import { prefetchTarget } from "@/platform/prefetch";
import { switchStarted } from "@/platform/telemetry";
import { TARGETS, type TargetId } from "@/platform/registry";

// ── Target switcher (LLD-03 §12) ───────────────────────────────────────
// `--target=<id>` chips, the visual sibling of the AST mode selector.
// Hidden while only one target is registered. Hover, keyboard focus or a
// touch on a chip prefetches that target's code (LLD-03 §11), so the
// switch only has to mount it.

/** `compact` shows the id alone even on the active chip (the narrow entity-list column). */
export function TargetSwitcher({ current, compact = false }: { current: TargetId; compact?: boolean }) {
  const search = useSearchParams();
  if (TARGETS.length < 2) return null;
  const focus = search.get(FOCUS_PARAM);

  return (
    <nav aria-label="Rendering target" className="flex flex-wrap items-center justify-end gap-1.5 font-mono max-sm:gap-1">
      {TARGETS.map(({ id }) => (
        <Link
          key={id}
          href={targetHref(id, { focus })}
          // Phones: tighter chips so ← root, four ids and ctx share one row.
          className="tv-chip tv-chip-tight"
          data-on={id === current ? "true" : undefined}
          aria-current={id === current ? "page" : undefined}
          onPointerEnter={() => id !== current && prefetchTarget(id)}
          onFocus={() => id !== current && prefetchTarget(id)}
          onClick={() => switchStarted(current, id)}
        >
          {/* The flag prefix only on the active chip, and only where the row
              has room beside the AST's mode chips (xl); elsewhere the id alone. */}
          {!compact && id === current && <span className="hidden xl:inline">--target=</span>}
          {id}
        </Link>
      ))}
    </nav>
  );
}
