"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FOCUS_PARAM, targetHref } from "@/platform/focus";
import { TARGETS, type TargetId } from "@/platform/registry";

// ── Target switcher (LLD-03 §12) ───────────────────────────────────────
// `--target=<id>` chips, the visual sibling of the AST mode selector.
// Hidden while only one target is registered, so the AST's top bar is
// unchanged until a second target ships.

export function TargetSwitcher({ current }: { current: TargetId }) {
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
        >
          --target={id}
        </Link>
      ))}
    </nav>
  );
}
