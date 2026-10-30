"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ir } from "@/platform/ir";

// ── Accessible entity list (LLD-03 §2) ─────────────────────────────────
// Rendered beside targets whose manifest says a11y "partial" or
// "decorative". Every entity, in contains order, as a WAI-ARIA tree that
// a keyboard or screen-reader user can traverse while the target shows
// the same focus. The URL focus is the single source of truth: the list
// reads it and asks the shell to change it, like any other chrome.

interface Row {
  id: string;
  label: string;
  kind: string;
  depth: number;
  parent: string | null;
  firstChild: string | null;
  setSize: number;
  posInSet: number;
}

// Static class names so Tailwind generates them; deeper levels reuse the last.
const INDENT = ["pl-3.5", "pl-7", "pl-[42px]", "pl-14", "pl-[70px]", "pl-[84px]"];

function buildRows(): Row[] {
  const rows: Row[] = [];
  ir.walk((e, depth) => {
    const parent = ir.parent(e.id);
    const siblings = parent ? ir.children(parent.id) : [e];
    rows.push({
      id: e.id,
      label: e.label,
      kind: e.kind,
      depth,
      parent: parent?.id ?? null,
      firstChild: ir.children(e.id)[0]?.id ?? null,
      setSize: siblings.length,
      posInSet: siblings.findIndex((s) => s.id === e.id) + 1,
    });
  });
  return rows;
}

// The IR is static for the page lifetime: build the rows once.
let cached: { rows: Row[]; index: Map<string, number> } | null = null;
function getRows() {
  if (!cached) {
    const rows = buildRows();
    cached = { rows, index: new Map(rows.map((r, i) => [r.id, i])) };
  }
  return cached;
}

interface Props {
  focus: string | null;
  onFocus(id: string): void;
  className?: string;
}

export function AccessibleEntityList({ focus, onFocus, className }: Props) {
  const router = useRouter();
  const { rows, index } = getRows();
  const refs = useRef(new Map<string, HTMLButtonElement>());
  // The row that takes Tab: the focused entity, or the first row.
  const active = focus && index.has(focus) ? focus : rows[0]?.id;

  // Keep the focused row in view when focus changes from the target.
  useEffect(() => {
    if (focus) refs.current.get(focus)?.scrollIntoView({ block: "nearest" });
  }, [focus]);

  const moveTo = (id: string | null | undefined) => {
    if (!id) return;
    onFocus(id);
    refs.current.get(id)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, row: Row) => {
    const i = index.get(row.id)!;
    const keys: Record<string, () => void> = {
      ArrowDown: () => moveTo(rows[i + 1]?.id),
      ArrowUp: () => moveTo(rows[i - 1]?.id),
      ArrowRight: () => moveTo(row.firstChild),
      ArrowLeft: () => moveTo(row.parent),
      Escape: () => moveTo(row.parent),
      Backspace: () => moveTo(row.parent),
      Home: () => moveTo(rows[0]?.id),
      End: () => moveTo(rows.at(-1)?.id),
      Enter: () => router.push(`/node/${row.id}`),
    };
    const run = keys[e.key];
    if (!run) return;
    e.preventDefault();
    run();
  };

  return (
    <nav aria-label="Entities" className={cn("flex min-h-0 flex-col font-mono text-xs", className)}>
      <div className="flex justify-between gap-2 whitespace-nowrap border-b border-[var(--line)] px-3.5 py-2.5 text-[11px] text-[var(--text-faint)]">
        <span>entities · {rows.length}</span>
        <span aria-hidden="true">arrows move · ↵ open</span>
      </div>
      <ul role="tree" aria-label="Portfolio entities" className="min-h-0 flex-1 overflow-y-auto pb-6 pt-1.5">
        {rows.map((row) => {
          const selected = row.id === focus;
          return (
            <li key={row.id} role="none">
              <button
                ref={(node) => {
                  if (node) refs.current.set(row.id, node);
                  else refs.current.delete(row.id);
                }}
                type="button"
                role="treeitem"
                aria-level={row.depth + 1}
                aria-setsize={row.setSize}
                aria-posinset={row.posInSet}
                aria-selected={selected}
                aria-expanded={row.firstChild ? true : undefined}
                tabIndex={row.id === active ? 0 : -1}
                onClick={() => onFocus(row.id)}
                onKeyDown={(e) => onKeyDown(e, row)}
                className={cn(
                  "flex w-full items-baseline gap-1.5 py-0.5 pr-3.5 text-left",
                  "text-[var(--text-mute)] hover:bg-[var(--accent-faint)] hover:text-[var(--tv-text)]",
                  "focus-visible:outline focus-visible:outline-[1.5px] focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)]",
                  selected && "bg-[var(--accent-faint)] text-[var(--accent)]",
                  INDENT[Math.min(row.depth, INDENT.length - 1)]
                )}
              >
                <span className="min-w-0 truncate">
                  {selected && <span aria-hidden="true">› </span>}
                  {row.label}
                </span>
                <span className="ml-auto shrink-0 text-[10px] text-[var(--text-faint)]">{row.kind}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
