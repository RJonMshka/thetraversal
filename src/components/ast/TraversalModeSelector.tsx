"use client";

import { cn } from "@/lib/utils";
import type { TraversalMode } from "@/lib/ast-types";

// ── Props ──────────────────────────────────────────────────────────────

interface TraversalModeSelectorProps {
  currentMode: TraversalMode;
  onModeChange: (mode: TraversalMode) => void;
}

// ── Mode config ────────────────────────────────────────────────────────

const MODES: {
  mode: TraversalMode;
  flag: string;
  description: string;
}[] = [
  {
    mode: "lex",
    flag: "--lex",
    description: "Labels + types only",
  },
  {
    mode: "parse",
    flag: "--parse",
    description: "Labels + summaries",
  },
  {
    mode: "eval",
    flag: "--eval",
    description: "Full content",
  },
];

// ── Component ──────────────────────────────────────────────────────────
// CLI-styled mode selector with $ prompt prefix.

export function TraversalModeSelector({
  currentMode,
  onModeChange,
}: TraversalModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 font-mono text-sm">
      <span className="text-ctp-green mr-1 select-none">$</span>
      <span className="text-ctp-overlay1 mr-2 select-none">traverse</span>
      {MODES.map(({ mode, flag, description }) => (
        <button
          key={mode}
          onClick={() => onModeChange(mode)}
          className={cn(
            "px-3 py-1.5 rounded transition-all duration-200",
            "hover:bg-ctp-surface0 focus-visible:outline-2 focus-visible:outline-ctp-lavender",
            currentMode === mode
              ? "bg-ctp-surface0 text-ctp-lavender"
              : "text-ctp-overlay1 hover:text-ctp-text"
          )}
          aria-label={`Traversal mode: ${flag} - ${description}`}
          aria-pressed={currentMode === mode}
          title={description}
        >
          {flag}
        </button>
      ))}
    </div>
  );
}
