"use client";

import { useState } from "react";
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
  tip: string;
}[] = [
  { mode: "lex",   flag: "— lex",   shortFlag: "lex",   tip: "words"     },
  { mode: "parse", flag: "— parse", shortFlag: "parse", tip: "structure" },
  { mode: "eval",  flag: "— eval",  shortFlag: "eval",  tip: "story"     },
];

// ── Component ──────────────────────────────────────────────────────────

export function TraversalModeSelector({
  currentMode,
  onModeChange,
  compact = false,
}: TraversalModeSelectorProps) {
  const [hovered, setHovered] = useState<TraversalMode | null>(null);

  return (
    <div className="flex items-center gap-2 font-mono text-sm">
      {!compact && (
        <span style={{ fontSize: 11, color: "var(--text-faint)", marginRight: 4 }}>
          $ traverse
        </span>
      )}
      {MODES.map(({ mode, flag, shortFlag, tip }) => (
        <div key={mode} className="relative">
          <button
            onClick={() => onModeChange(mode)}
            onMouseEnter={() => setHovered(mode)}
            onMouseLeave={() => setHovered(null)}
            className={cn(
              "tv-chip transition-colors duration-150",
              compact ? "text-xs" : ""
            )}
            data-on={currentMode === mode ? "true" : undefined}
            aria-pressed={currentMode === mode}
            aria-label={`Traversal mode: ${flag} — ${tip}`}
            style={{ cursor: "pointer" }}
          >
            {compact ? shortFlag : flag}
          </button>

          {hovered === mode && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--ink-3)",
                border: "1px solid var(--line-2)",
                borderRadius: 4,
                padding: "3px 8px",
                fontSize: 10,
                color: "var(--text-mute)",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                zIndex: 50,
                fontFamily: "var(--mono)",
              }}
            >
              {tip}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
