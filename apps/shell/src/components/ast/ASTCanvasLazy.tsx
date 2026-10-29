"use client";

import dynamic from "next/dynamic";
import type { TraversalMode } from "@/lib/ast-types";

const ASTCanvasDynamic = dynamic(
  () => import("@/components/ast/ASTCanvas").then((mod) => ({ default: mod.ASTCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-ctp-base">
        <div className="text-center">
          <div className="text-ctp-overlay2 text-xs font-mono animate-pulse mb-2">
            loading AST visualizer...
          </div>
          {/* Skeleton tree */}
          <svg
            width="200"
            height="120"
            viewBox="0 0 200 120"
            className="opacity-20"
          >
            <circle cx="100" cy="15" r="8" fill="var(--color-ctp-surface1)" />
            <line
              x1="100" y1="23" x2="60" y2="55"
              stroke="var(--color-ctp-surface1)" strokeWidth="1"
            />
            <line
              x1="100" y1="23" x2="140" y2="55"
              stroke="var(--color-ctp-surface1)" strokeWidth="1"
            />
            <circle cx="60" cy="60" r="6" fill="var(--color-ctp-surface1)" />
            <circle cx="140" cy="60" r="6" fill="var(--color-ctp-surface1)" />
            <line
              x1="60" y1="66" x2="40" y2="95"
              stroke="var(--color-ctp-surface0)" strokeWidth="1"
            />
            <line
              x1="60" y1="66" x2="80" y2="95"
              stroke="var(--color-ctp-surface0)" strokeWidth="1"
            />
            <circle cx="40" cy="100" r="4" fill="var(--color-ctp-surface0)" />
            <circle cx="80" cy="100" r="4" fill="var(--color-ctp-surface0)" />
          </svg>
        </div>
      </div>
    ),
  }
);

interface ASTCanvasLazyProps {
  mode: TraversalMode;
  onNodeSelect?: (slug: string | null) => void;
}

export function ASTCanvasLazy({ mode, onNodeSelect }: ASTCanvasLazyProps) {
  return <ASTCanvasDynamic mode={mode} onNodeSelect={onNodeSelect} />;
}
