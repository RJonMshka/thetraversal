import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Entity } from "@tv/ir";
import { KIND_KEYWORD } from "@/lib/kind-label";
import { NodeBody, hasNodeBody } from "@/components/shared/NodeBody";

interface GenericNodeProps {
  entity: Entity;
  bodyHtml?: string;
}

export function GenericNode({ entity, bodyHtml }: GenericNodeProps) {
  const keyword = KIND_KEYWORD[entity.kind];
  const tags = entity.tags;
  const links = entity.links;

  return (
    <article className="space-y-8">
      {/* Node type header */}
      <header className="space-y-3">
        <div className="font-mono">
          <span className="text-ctp-mauve">{keyword}</span>{" "}
          <span className="text-ctp-text text-xl font-bold">{entity.label}</span>
        </div>

        {entity.summary && (
          <p className="text-ctp-subtext0 text-sm font-mono">
            {"// "}{entity.summary}
          </p>
        )}
      </header>

      {/* Body content */}
      {hasNodeBody({ html: bodyHtml, text: entity.excerpt }) && (
        <NodeBody html={bodyHtml} text={entity.excerpt} className="space-y-4" />
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs font-mono rounded bg-ctp-surface0 text-ctp-overlay1 border border-ctp-surface1"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Links */}
      {links.length > 0 && (
        <div className="flex items-center gap-4">
          {links.map((link) => (
            <Link
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-ctp-blue hover:text-ctp-sapphire transition-colors underline underline-offset-4 decoration-ctp-blue/30"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
