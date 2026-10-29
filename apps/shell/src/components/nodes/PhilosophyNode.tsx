import { cn } from "@/lib/utils";
import { loadEssay } from "@/lib/mdx";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";
import { mdxComponents } from "@/components/shared/mdx-components";
import { ReadingProgress } from "@/components/shared/ReadingProgress";
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

// ── Fallback body renderer (when no MDX file exists) ───────────────────
function FallbackBody({ body }: { body: string }) {
  const paragraphs = body.split("\n\n").filter(Boolean);
  return (
    <div
      className={cn(
        "space-y-6 max-w-[65ch]",
        "font-serif text-base leading-[1.8] text-ctp-text"
      )}
    >
      {paragraphs.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}

export async function PhilosophyNode({ node }: PhilosophyNodeProps) {
  const tags = node.meta?.tags ?? [];
  const date = node.meta?.date;
  const essaySlug = node.content?.deep;

  // Try to load the MDX essay
  const mdxSource = essaySlug ? await loadEssay(essaySlug) : null;

  // Estimate reading time from MDX source or fallback body
  const textForTime = mdxSource ?? node.content?.body ?? "";
  const readingTime = estimateReadingTime(textForTime);

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

      {/* Essay content */}
      {mdxSource ? (
        <div className="max-w-[65ch] mdx-essay">
          <MDXRemote
            source={mdxSource}
            components={mdxComponents}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm],
                rehypePlugins: [
                  [
                    rehypePrettyCode,
                    {
                      theme: "catppuccin-mocha",
                      keepBackground: false,
                    },
                  ],
                ],
              },
            }}
          />
        </div>
      ) : (
        <FallbackBody body={node.content?.body ?? ""} />
      )}
    </article>
  );
}
