import Link from "next/link";
import { cn } from "@/lib/utils";
import { getGlowClasses } from "@/lib/glow";
import type { ASTNode } from "@/lib/ast-types";
import { NodeBody } from "@/components/shared/NodeBody";

interface IdentityNodeProps {
  node: ASTNode;
  bodyHtml?: string;
  siblings?: ASTNode[];
}

export function IdentityNode({ node, bodyHtml, siblings = [] }: IdentityNodeProps) {
  const links = node.meta?.links ?? [];

  return (
    <article className="space-y-8">
      {/* Import statement header */}
      <header className="space-y-4">
        <div className="font-mono">
          <span className="text-ctp-mauve">import</span>
          <span className="text-ctp-overlay1">{" { "}</span>
          <span className="text-ctp-yellow text-xl font-bold">Rajat</span>
          <span className="text-ctp-overlay1">{" } "}</span>
          <span className="text-ctp-mauve">from</span>{" "}
          <span className="text-ctp-green">&quot;chicago&quot;</span>
        </div>

        {/* Summary */}
        {node.content?.summary && (
          <p className="text-ctp-subtext0 text-sm font-mono">
            {"// "}{node.content.summary}
          </p>
        )}
      </header>

      {/* Divider */}
      <div className="border-t border-ctp-surface0" />

      {/* Bio paragraphs */}
      <NodeBody html={bodyHtml} text={node.content?.body} className="space-y-4 max-w-[65ch]" />

      {/* External links */}
      {links.length > 0 && (
        <div className="flex items-center gap-4">
          {links.map((link) => (
            <Link
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-ctp-blue hover:text-ctp-sapphire transition-colors underline underline-offset-4 decoration-ctp-blue/30 hover:decoration-ctp-sapphire/50"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      {/* Links to top-level AST branches */}
      {siblings.length > 0 && (
        <div className="border-t border-ctp-surface0 pt-8">
          <h2 className="text-sm font-mono text-ctp-overlay2 mb-4">
            {"// explore the tree"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {siblings
              .filter((s) => s.slug !== node.slug)
              .map((sibling) => {
                const glow = getGlowClasses(sibling.glowColor);
                return (
                  <Link
                    key={sibling.id}
                    href={`/node/${sibling.slug}`}
                    className={cn(
                      "group block p-4 rounded-lg border transition-all duration-200",
                      "bg-ctp-surface0/30 hover:bg-ctp-surface0/60",
                      glow.border,
                      "hover:shadow-lg",
                      glow.shadow,
                    )}
                  >
                    <span className="text-[10px] font-mono text-ctp-overlay1 block mb-1">
                      {sibling.type}
                    </span>
                    <span className={cn(
                      "text-sm font-mono font-medium block",
                      glow.text,
                    )}>
                      {sibling.label}
                    </span>
                    {sibling.content?.summary && (
                      <span className="text-xs text-ctp-subtext0 block mt-1 line-clamp-2">
                        {sibling.content.summary}
                      </span>
                    )}
                  </Link>
                );
              })}
          </div>
        </div>
      )}
    </article>
  );
}
