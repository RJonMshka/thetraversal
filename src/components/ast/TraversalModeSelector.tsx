"use client";

import { cn } from "@/lib/utils";
import type { TraversalMode } from "@/lib/ast-types";

// ── Props ──────────────────────────────────────────────────────────────

interface TraversalModeSelectorProps {
  currentMode: TraversalMode;
  onModeChange: (mode: TraversalMode) => void;
  /** Render the compact variant (no prefix, tighter padding) */
  compact?: boolean;
}

// ── Mode config ────────────────────────────────────────────────────────

const MODES: {
  mode: TraversalMode;
  flag: string;
  shortFlag: string;
  description: string;
}[] = [
  {
    mode: "lex",
    flag: "--lex",
    shortFlag: "lex",
    description: "Labels + types only",
  },
  {
    mode: "parse",
    flag: "--parse",
    shortFlag: "parse",
    description: "Labels + summaries",
  },
  {
    mode: "eval",
    flag: "--eval",
    shortFlag: "eval",
    description: "Full content",
  },
];

// ── Component ──────────────────────────────────────────────────────────
// CLI-styled mode selector with $ prompt prefix.
// Compact mode: drops the `$ traverse` prefix and uses tighter spacing.

export function TraversalModeSelector({
  currentMode,
  onModeChange,
  compact = false,
}: TraversalModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 font-mono text-sm">
      {!compact && (
        <>
          <span className="text-ctp-green mr-1 select-none">$</span>
          <span className="text-ctp-overlay1 mr-2 select-none">traverse</span>
        </>
      )}
      {MODES.map(({ mode, flag, shortFlag, description }) => (
        <button
          key={mode}
          onClick={() => onModeChange(mode)}
          className={cn(
            "rounded transition-all duration-200",
            "hover:bg-ctp-surface0 focus-visible:outline-2 focus-visible:outline-ctp-lavender",
            compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5",
            currentMode === mode
              ? "bg-ctp-surface0 text-ctp-lavender"
              : "text-ctp-overlay1 hover:text-ctp-text"
          )}
          aria-label={`Traversal mode: ${flag} - ${description}`}
          aria-pressed={currentMode === mode}
          title={description}
        >
          {compact ? shortFlag : flag}
        </button>
      ))}
    </div>
  );
}
