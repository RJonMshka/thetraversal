import { cn } from "@/lib/utils";
import { loadEssay } from "@/lib/content";
import { ReadingProgress } from "@/components/shared/ReadingProgress";
import type { ASTNode } from "@/targets/ast/lib/ast-types";

interface PhilosophyNodeProps {
  node: ASTNode;
  bodyHtml?: string;
}

// ── Reading time estimate (when there is no compiled essay) ────────────
function estimateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

// ── Fallback body (no essay): node prose in the essay's serif voice ─────
// Paragraphs carry no classes; they inherit from the container.
function FallbackBody({ html, text }: { html?: string; text: string }) {
  const className = cn(
    "space-y-6 max-w-[65ch]",
    "font-serif text-base leading-[1.8] text-ctp-text"
  );
  if (html) {
    // Sanitized at build time by the IR compiler.
    return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  const paragraphs = text.split("\n\n").filter(Boolean);
  return (
    <div className={className}>
      {paragraphs.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}

export async function PhilosophyNode({ node, bodyHtml }: PhilosophyNodeProps) {
  const tags = node.meta?.tags ?? [];
  const date = node.meta?.date;
  const essayRef = node.content?.deep;

  // The long-form essay from the IR body store, when the node has one
  const essay = essayRef ? await loadEssay(essayRef) : null;
  const readingTime =
    essay?.readingMinutes ?? estimateReadingTime(node.content?.body ?? "");

  return (
    <article className="space-y-8">
      {/* Reading progress bar */}
      <ReadingProgress />

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
        <div className="flex items-center gap-4 text-xs font-mono text-ctp-overlay2">
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

      {/* Essay content (compiled and sanitized by the IR build) */}
      {essay ? (
        <div
          className="max-w-[65ch] tv-prose"
          dangerouslySetInnerHTML={{ __html: essay.html }}
        />
      ) : (
        <FallbackBody html={bodyHtml} text={node.content?.body ?? ""} />
      )}
    </article>
  );
}
