"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getFlatNodes } from "@/data";
import type { ASTNodeType } from "@/lib/ast-types";

// ── Token role → display style ─────────────────────────────────────────

type TokenRole = "keyword" | "identifier" | "string" | "comment" | "type" | "punctuation";

const ROLE_COLOR: Record<TokenRole, string> = {
  keyword:     "var(--keyword)",
  identifier:  "var(--tv-text)",
  string:      "var(--string)",
  comment:     "var(--comment)",
  type:        "var(--type)",
  punctuation: "var(--text-faint)",
};

// ── Node type → token metadata ─────────────────────────────────────────

function classify(type: ASTNodeType): { prefix?: string; role: TokenRole } {
  switch (type) {
    case "RootNode":            return { prefix: "const",  role: "keyword" };
    case "FunctionDeclaration": return { prefix: "fn",     role: "keyword" };
    case "VariableDeclaration": return { prefix: "const",  role: "keyword" };
    case "ImportDeclaration":   return { prefix: "import", role: "keyword" };
    case "ExportDeclaration":   return { prefix: "export", role: "keyword" };
    case "StringLiteral":       return { role: "string" };
    case "TypeAnnotation":      return { role: "comment" };
    case "CallExpression":      return { role: "type" };
    case "ObjectExpression":    return { role: "punctuation" };
    case "ArrayExpression":     return { role: "punctuation" };
    default:                    return { role: "identifier" };
  }
}

function displayText(type: ASTNodeType, label: string): string {
  switch (type) {
    case "RootNode":
      return label.toLowerCase().replace(/\s+/g, "_");
    case "StringLiteral":
      return `"${label}"`;
    case "FunctionDeclaration":
      return `${label}()`;
    case "CallExpression":
      return `${label.toLowerCase().replace(/\s+/g, "_")}()`;
    case "TypeAnnotation":
      return `/* ${label} */`;
    case "ArrayExpression":
      return `[${label.toLowerCase()}]`;
    case "ObjectExpression":
      return `{${label.toLowerCase()}}`;
    default:
      return label;
  }
}

// ── Component ──────────────────────────────────────────────────────────

export function ASTLexView() {
  const router = useRouter();
  const nodes = getFlatNodes();

  return (
    <motion.div
      key="lex"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
      style={{
        padding: "32px 40px 80px",
        fontFamily: "var(--mono)",
        minHeight: "100%",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div className="tv-tag" style={{ marginBottom: 6 }}>
          // lex · portfolio as token stream
        </div>
        <div style={{ fontSize: 10, color: "var(--text-faint)" }}>
          {nodes.length} tokens · click any to open
        </div>
      </div>

      {/* Token ribbon */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 6px",
          alignContent: "flex-start",
        }}
      >
        {nodes.map((node, i) => {
          const { prefix, role } = classify(node.type);
          const text = displayText(node.type, node.label);
          const color = ROLE_COLOR[role];
          const isComment = role === "comment";

          return (
            <button
              key={`${node.id}-${i}`}
              onClick={() => router.push(`/node/${node.slug}`)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                border: "1px solid var(--line-2)",
                borderRadius: 5,
                background: "rgba(255,255,255,0.02)",
                cursor: "pointer",
                fontFamily: "var(--mono)",
                fontSize: 12,
                opacity: node.depth > 1 ? 0.8 : 1,
                transition: "border-color 150ms, background 150ms",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--line-strong)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(255,255,255,0.02)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--line-2)";
              }}
            >
              {prefix && (
                <span
                  style={{
                    color: "var(--keyword)",
                    fontSize: 10,
                    letterSpacing: "0.04em",
                  }}
                >
                  {prefix}
                </span>
              )}
              <span
                style={{
                  color,
                  fontStyle: isComment ? "italic" : "normal",
                }}
              >
                {text}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
