"use client";

import { cn } from "@/lib/utils";
import type { TraversalMode } from "@/lib/ast-types";

interface TraversalModeSelectorProps {
  currentMode: TraversalMode;
  onModeChange: (mode: TraversalMode) => void;
  compact?: boolean;
}

const MODES: { mode: TraversalMode; flag: string; shortFlag: string }[] = [
  { mode: "lex",   flag: "— lex",   shortFlag: "lex"   },
  { mode: "parse", flag: "— parse", shortFlag: "parse" },
  { mode: "eval",  flag: "— eval",  shortFlag: "eval"  },
];

export function TraversalModeSelector({
  currentMode,
  onModeChange,
  compact = false,
}: TraversalModeSelectorProps) {
  return (
    <div className="flex items-center gap-2 font-mono text-sm">
      {!compact && (
        <span style={{ fontSize: 11, color: "var(--text-faint)", marginRight: 4 }}>
          $ traverse
        </span>
      )}
      {MODES.map(({ mode, flag, shortFlag }) => (
        <button
          key={mode}
          onClick={() => onModeChange(mode)}
          className={cn("tv-chip transition-colors duration-150", compact ? "text-xs" : "")}
          data-on={currentMode === mode ? "true" : undefined}
          aria-pressed={currentMode === mode}
          aria-label={`Traversal mode: ${flag}`}
          style={{ cursor: "pointer" }}
        >
          {compact ? shortFlag : flag}
        </button>
      ))}
    </div>
  );
}
