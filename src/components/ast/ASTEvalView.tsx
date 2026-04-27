"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { getAST } from "@/data";
import type { ASTNodeType } from "@/lib/ast-types";

// ── Section glyphs ─────────────────────────────────────────────────────
// Minimal SVG icons, one per top-level AST node type.

function SectionGlyph({ type }: { type: ASTNodeType }) {
  const p = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (type) {
    case "ProgramNode":
      return (
        <svg {...p}>
          <circle cx="12" cy="9" r="3.5" />
          <path d="M5 19c1-3.5 4-5 7-5s6 1.5 7 5" />
        </svg>
      );
    case "BlockStatement":
      return (
        <svg {...p}>
          <rect x="4" y="5" width="7" height="7" />
          <rect x="13" y="5" width="7" height="7" />
          <rect x="4" y="14" width="7" height="6" />
          <rect x="13" y="14" width="7" height="6" />
        </svg>
      );
    case "ExpressionStatement":
      return (
        <svg {...p}>
          <path d="M9 18h6" />
          <path d="M10 21h4" />
          <path d="M8 14a4.5 4.5 0 1 1 8 0c0 1.5-.7 2.4-1.5 3.2-.3.3-.5.6-.5 1H10c0-.4-.2-.7-.5-1C8.7 16.4 8 15.5 8 14z" />
        </svg>
      );
    case "VariableDeclaration":
      return (
        <svg {...p}>
          <circle cx="6" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="18" cy="12" r="1.6" fill="currentColor" />
          <path d="M7.6 12h2.8M13.6 12h2.8" />
        </svg>
      );
    case "ExportDeclaration":
      return (
        <svg {...p}>
          <path d="M4 7h16v10H4z" />
          <path d="M4 7l8 6 8-6" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <path d="M8 7l-4 5 4 5" />
          <path d="M16 7l4 5-4 5" />
        </svg>
      );
  }
}

// ── Component ──────────────────────────────────────────────────────────

export function ASTEvalView() {
  const ast = getAST();
  const children = ast.children ?? [];

  return (
    <motion.div
      key="eval"
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
      {/* ── Hero: root node ─────────────────────────────────────────── */}
      <Link
        href={`/node/${ast.slug}`}
        style={{
          display: "block",
          padding: "36px 44px",
          background: "linear-gradient(135deg, var(--ink-2), var(--ink-3))",
          border: "1px solid var(--line-2)",
          borderRadius: 10,
          marginBottom: 16,
          textDecoration: "none",
          transition: "border-color 200ms",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--line-strong)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--line-2)";
        }}
      >
        <div className="tv-tag" style={{ marginBottom: 10 }}>
          // hello
        </div>
        <div
          style={{
            fontFamily: "var(--serif)",
            fontSize: "clamp(40px, 5vw, 60px)",
            lineHeight: 0.96,
            letterSpacing: "-0.02em",
            color: "var(--tv-text)",
            marginBottom: 18,
            fontWeight: 400,
          }}
        >
          Rajat{" "}
          <span style={{ fontStyle: "italic", color: "var(--accent)" }}>
            Kumar
          </span>
          .
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text-mute)",
            lineHeight: 1.7,
            maxWidth: 560,
            marginBottom: 20,
          }}
        >
          {ast.content?.body || ast.content?.summary}
        </div>
        <div
          style={{
            display: "flex",
            gap: 20,
            fontSize: 10,
            color: "var(--text-faint)",
            letterSpacing: "0.12em",
          }}
        >
          <span>SENIOR · ENGINEER</span>
          <span>CHICAGO · IL</span>
          <span style={{ color: "var(--accent)" }}>● shipping</span>
        </div>
      </Link>

      {/* ── Section cards ───────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        {children.map((child) => (
          <Link
            key={child.id}
            href={`/node/${child.slug}`}
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "20px 22px",
              background: "var(--ink-2)",
              border: "1px solid var(--line-2)",
              borderRadius: 8,
              textDecoration: "none",
              transition: "border-color 200ms, box-shadow 200ms",
              minHeight: 156,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--line-strong)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 0 0 1px var(--line), 0 8px 24px -8px rgba(0,0,0,0.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--line-2)";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            {/* Icon + link hint */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 14,
                color: "var(--text-mute)",
              }}
            >
              <SectionGlyph type={child.type} />
              <span style={{ fontSize: 10, color: "var(--text-faint)" }}>
                open →
              </span>
            </div>

            {/* Label */}
            <div
              style={{
                fontSize: 16,
                color: "var(--tv-text)",
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              {child.label}
            </div>

            {/* Type */}
            <span className="tv-tag" style={{ marginBottom: 12 }}>
              {child.type}
            </span>

            {/* Summary */}
            {child.content?.summary && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-mute)",
                  lineHeight: 1.65,
                  marginTop: "auto",
                }}
              >
                {child.content.summary}
              </div>
            )}

            {/* Children count */}
            {child.children && child.children.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 10,
                  color: "var(--text-faint)",
                }}
              >
                {child.children.length}{" "}
                {child.children.length === 1 ? "child" : "children"}
              </div>
            )}
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
