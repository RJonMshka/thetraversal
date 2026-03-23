import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ASTNode } from "@/lib/ast-types";

interface ProjectNodeProps {
  node: ASTNode;
}

export function ProjectNode({ node }: ProjectNodeProps) {
  const params = node.meta?.params ?? [];
  const tags = node.meta?.tags ?? [];
  const links = node.meta?.links ?? [];
  const bodyParagraphs = node.content?.body?.split("\n\n").filter(Boolean) ?? [];

  return (
    <article className="space-y-8">
      {/* Function signature header */}
      <header className="space-y-3">
        <div className="font-mono">
          <span className="text-ctp-mauve">function</span>{" "}
          <span className="text-ctp-peach text-xl font-bold">{node.label}</span>
          <span className="text-ctp-overlay1">(</span>
          {params.map((param, i) => (
            <span key={param}>
              {i > 0 && <span className="text-ctp-overlay1">, </span>}
              <span className="text-ctp-yellow">{param.toLowerCase().replace(/[\s.]/g, "_")}</span>
            </span>
          ))}
          <span className="text-ctp-overlay1">)</span>
          <span className="text-ctp-overlay1">{" {"}</span>
        </div>

        {/* Summary as a comment inside the function */}
        {node.content?.summary && (
          <p className="text-ctp-subtext0 text-sm font-mono pl-6">
            {"// "}{node.content.summary}
          </p>
        )}
      </header>

      {/* Body content — indented to look like function body */}
      <div className="pl-6 space-y-4">
        {bodyParagraphs.map((paragraph, i) => (
          <p key={i} className="text-ctp-text text-sm leading-7">
            {paragraph}
          </p>
        ))}
      </div>

      {/* Tech stack tags */}
      {tags.length > 0 && (
        <div className="pl-6 space-y-2">
          <span className="text-xs font-mono text-ctp-overlay0">
            {"// tags"}
          </span>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs font-mono rounded bg-ctp-surface0 text-ctp-peach/80 border border-ctp-peach/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Return statement with links */}
      <footer className="space-y-3 font-mono">
        <div className="pl-6">
          <span className="text-ctp-mauve">return</span>
          <span className="text-ctp-overlay1">{" {"}</span>
        </div>

        {links.length > 0 && (
          <div className="pl-12 space-y-1">
            <span className="text-ctp-overlay0 text-sm">links: [</span>
            {links.map((link, i) => (
              <div key={link.url} className="pl-4">
                <Link
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "text-ctp-blue hover:text-ctp-sapphire transition-colors text-sm",
                    "underline underline-offset-4 decoration-ctp-blue/30 hover:decoration-ctp-sapphire/50",
                  )}
                >
                  &quot;{link.label}&quot;
                </Link>
                {i < links.length - 1 && <span className="text-ctp-overlay1">,</span>}
              </div>
            ))}
            <span className="text-ctp-overlay0 text-sm">]</span>
          </div>
        )}

        <div className="pl-6">
          <span className="text-ctp-overlay1">{"}"}</span>
        </div>

        {/* Closing brace of function */}
        <div>
          <span className="text-ctp-overlay1">{"}"}</span>
        </div>
      </footer>
    </article>
  );
}
