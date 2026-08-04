"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ASTNode } from "@/lib/ast-types";

interface SkillNodeProps {
  node: ASTNode;
}

export function SkillNode({ node }: SkillNodeProps) {
  const children = node.children ?? [];
  const bodyParagraphs = node.content?.body?.split("\n\n").filter(Boolean) ?? [];

  return (
    <article className="space-y-8">
      {/* Object expression header */}
      <header className="space-y-3">
        <div className="font-mono">
          <span className="text-ctp-mauve">const</span>{" "}
          <span className="text-ctp-mauve text-xl font-bold">
            {node.label.toLowerCase()}
          </span>
          <span className="text-ctp-overlay1">: </span>
          <span className="text-ctp-yellow">ObjectExpression</span>
          <span className="text-ctp-overlay1">{" = {"}</span>
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

      {/* Keys of the object expression — each one traversable */}
      {children.length > 0 && (
        <div className="pl-6 space-y-3">
          <span className="text-xs font-mono text-ctp-overlay0">
            {`// ${children.length} keys`}
          </span>
          <div className="flex flex-wrap gap-2">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/node/${child.slug}`}
                className={cn(
                  "px-2.5 py-1 text-xs font-mono rounded",
                  "bg-ctp-surface0 text-ctp-mauve/90 border border-ctp-mauve/20",
                  "hover:border-ctp-mauve/50 hover:text-ctp-mauve hover:bg-ctp-surface1",
                  "transition-colors duration-200",
                )}
              >
                {child.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Closing brace */}
      <div className="font-mono">
        <span className="text-ctp-overlay1">{"}"}</span>
      </div>
    </article>
  );
}
