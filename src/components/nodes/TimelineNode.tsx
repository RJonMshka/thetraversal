"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ASTNode } from "@/lib/ast-types";

interface TimelineNodeProps {
  node: ASTNode;
}

// ── Timeline Entry ─────────────────────────────────────────────────────
interface TimelineEntryProps {
  entry: ASTNode;
  index: number;
  isLast: boolean;
}

function TimelineEntry({ entry, index, isLast }: TimelineEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isCurrent = entry.meta?.tags?.includes("current") ?? false;
  const date = entry.meta?.date;
  const bodyParagraphs = entry.content?.body?.split("\n\n").filter(Boolean) ?? [];

  return (
    <div className="relative flex gap-4">
      {/* Vertical line + dot */}
      <div className="flex flex-col items-center shrink-0">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "w-4 h-4 rounded-full border-2 shrink-0 transition-all duration-200 z-10",
            isCurrent
              ? "bg-ctp-teal border-ctp-teal animate-glow-pulse"
              : isExpanded
                ? "bg-ctp-teal/60 border-ctp-teal/60"
                : "bg-ctp-surface0 border-ctp-surface1 hover:border-ctp-teal/50",
          )}
          aria-label={`Toggle details for ${entry.label}`}
        />
        {!isLast && (
          <div className="w-px flex-1 bg-ctp-surface1 min-h-8" />
        )}
      </div>

      {/* Content */}
      <div className="pb-8 min-w-0 flex-1">
        {/* Array index + date */}
        <div className="flex items-center gap-3 mb-1 font-mono text-xs text-ctp-overlay2">
          <span>[{index}]</span>
          {date && <span>{date}</span>}
          {isCurrent && (
            <span className="text-ctp-teal text-[10px] px-1.5 py-0.5 rounded bg-ctp-teal/10 border border-ctp-teal/20">
              current
            </span>
          )}
        </div>

        {/* Title */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-left w-full group"
        >
          <h3 className="text-ctp-text font-mono font-medium text-sm group-hover:text-ctp-teal transition-colors">
            {entry.label}
          </h3>
          {entry.content?.summary && (
            <p className="text-ctp-subtext0 text-xs mt-1">
              {entry.content.summary}
            </p>
          )}
        </button>

        {/* Expanded content */}
        {isExpanded && bodyParagraphs.length > 0 && (
          <div className="mt-4 pl-4 border-l border-ctp-teal/20 space-y-3">
            {bodyParagraphs.map((paragraph, i) => (
              <p key={i} className="text-ctp-text text-sm leading-7">
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TimelineNode({ node }: TimelineNodeProps) {
  // For the VariableDeclaration wrapper, show the ArrayExpression children
  // For the ArrayExpression itself, show the StringLiteral entries
  const entries = node.type === "VariableDeclaration"
    ? (node.children?.[0]?.children ?? [])
    : (node.children ?? []);

  const bodyParagraphs = node.content?.body?.split("\n\n").filter(Boolean) ?? [];

  return (
    <article className="space-y-8">
      {/* Variable declaration header */}
      <header className="space-y-3">
        <div className="font-mono">
          <span className="text-ctp-mauve">const</span>{" "}
          <span className="text-ctp-teal text-xl font-bold">journey</span>
          <span className="text-ctp-overlay1">: </span>
          <span className="text-ctp-yellow">Experience[]</span>
          <span className="text-ctp-overlay1">{" = ["}</span>
        </div>

        {node.content?.summary && (
          <p className="text-ctp-subtext0 text-sm font-mono pl-6">
            {"// "}{node.content.summary}
          </p>
        )}
      </header>

      {/* Description */}
      {bodyParagraphs.length > 0 && (
        <div className="pl-6 space-y-4">
          {bodyParagraphs.map((paragraph, i) => (
            <p key={i} className="text-ctp-text text-sm leading-7">
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {/* Timeline entries */}
      <div className="pl-6">
        {entries.map((entry, i) => (
          <TimelineEntry
            key={entry.id}
            entry={entry}
            index={i}
            isLast={i === entries.length - 1}
          />
        ))}
      </div>

      {/* Closing bracket */}
      <div className="font-mono">
        <span className="text-ctp-overlay1">{"]"}</span>
      </div>
    </article>
  );
}
