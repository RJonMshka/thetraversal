import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ASTNode } from "@/lib/ast-types";

interface GenericNodeProps {
  node: ASTNode;
}

// ── Type label map ─────────────────────────────────────────────────────
const TYPE_KEYWORDS: Record<string, string> = {
  BlockStatement: "block",
  StringLiteral: "literal",
  ImportDeclaration: "import",
  TypeAnnotation: "type",
  ExpressionStatement: "expression",
  VariableDeclaration: "const",
  ArrayExpression: "array",
  RootNode: "root",
};

export function GenericNode({ node }: GenericNodeProps) {
  const keyword = TYPE_KEYWORDS[node.type] ?? node.type.toLowerCase();
  const bodyParagraphs = node.content?.body?.split("\n\n").filter(Boolean) ?? [];
  const tags = node.meta?.tags ?? [];
  const links = node.meta?.links ?? [];

  return (
    <article className="space-y-8">
      {/* Node type header */}
      <header className="space-y-3">
        <div className="font-mono">
          <span className="text-ctp-mauve">{keyword}</span>{" "}
          <span className="text-ctp-text text-xl font-bold">{node.label}</span>
        </div>

        {node.content?.summary && (
          <p className="text-ctp-subtext0 text-sm font-mono">
            {"// "}{node.content.summary}
          </p>
        )}
      </header>

      {/* Body content */}
      {bodyParagraphs.length > 0 && (
        <div className="space-y-4">
          {bodyParagraphs.map((paragraph, i) => (
            <p key={i} className="text-ctp-text text-sm leading-7">
              {paragraph}
            </p>
          ))}
        </div>
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
