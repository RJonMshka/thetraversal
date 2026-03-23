import { cn } from "@/lib/utils";
import type { ASTNode } from "@/lib/ast-types";

interface PhilosophyNodeProps {
  node: ASTNode;
}

// ── Reading time estimate ──────────────────────────────────────────────
function estimateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function PhilosophyNode({ node }: PhilosophyNodeProps) {
  const bodyParagraphs = node.content?.body?.split("\n\n").filter(Boolean) ?? [];
  const fullText = node.content?.body ?? "";
  const readingTime = estimateReadingTime(fullText);
  const tags = node.meta?.tags ?? [];
  const date = node.meta?.date;

  return (
    <article className="space-y-8">
      {/* Call expression header */}
      <header className="space-y-4">
        <div className="font-mono">
          <span className="text-ctp-lavender text-xl font-bold">
            {node.label.toLowerCase().replace(/\s+/g, "_")}
          </span>
          <span className="text-ctp-overlay1">(</span>
          {tags.slice(0, 3).map((tag, i) => (
            <span key={tag}>
              {i > 0 && <span className="text-ctp-overlay1">, </span>}
              <span className="text-ctp-green">&quot;{tag}&quot;</span>
            </span>
          ))}
          <span className="text-ctp-overlay1">)</span>
        </div>

        {/* Meta line: date + reading time */}
        <div className="flex items-center gap-4 text-xs font-mono text-ctp-overlay0">
          {date && <span>{date}</span>}
          <span>{readingTime} min read</span>
        </div>

        {/* Summary */}
        {node.content?.summary && (
          <p className="text-ctp-subtext0 text-sm font-mono italic">
            {node.content.summary}
          </p>
        )}
      </header>

      {/* Divider */}
      <div className="border-t border-ctp-surface0" />

      {/* Essay body — serif typography */}
      <div className={cn(
        "space-y-6 max-w-[65ch]",
        "font-serif text-base leading-[1.8] text-ctp-text",
      )}>
        {bodyParagraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      {/* MDX essay note — will be replaced in Phase 7 */}
      {node.content?.deep && (
        <div className="border-t border-ctp-surface0 pt-6">
          <p className="text-xs font-mono text-ctp-overlay0">
            {"// full essay available when MDX content is loaded (Phase 7)"}
          </p>
        </div>
      )}
    </article>
  );
}
