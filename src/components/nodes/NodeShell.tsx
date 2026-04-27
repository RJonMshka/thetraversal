"use client";

import Link from "next/link";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTraversalState } from "@/hooks/useTraversalState";
import type { ASTNode, ASTPath } from "@/lib/ast-types";

interface NodeShellProps {
  node: ASTNode;
  path: ASTPath;
  children: React.ReactNode;
}

export function NodeShell({ node, path, children }: NodeShellProps) {
  const visitNode = useTraversalState((s) => s.visitNode);

  useEffect(() => {
    visitNode(node.slug, node.label, node.type, node.glowColor);
  }, [node.slug, node.label, node.type, node.glowColor, visitNode]);

  return (
    <main
      id="main-content"
      className="min-h-screen"
      style={{ background: "var(--ink)", color: "var(--tv-text)", fontFamily: "var(--mono)" }}
    >
      {/* ── Top navigation bar ──────────────────────────────────────── */}
      <header
        className="sticky top-0 z-10"
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--line)",
          background: "rgba(11,13,16,0.85)",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Back link */}
        <Link
          href="/tree"
          style={{ fontSize: 12, color: "var(--text-faint)", transition: "color 150ms" }}
          className="hover:text-[var(--tv-text)]"
        >
          ← tree
        </Link>

        {/* AST path breadcrumb — reads like Program → identity → skills */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 overflow-x-auto scrollbar-hidden"
          style={{ marginTop: 10, fontSize: 11, color: "var(--text-mute)" }}
        >
          <span style={{ color: "var(--text-faint)" }}>Program</span>
          {path.map((segment, i) => (
            <span key={segment.id} className="flex items-center gap-1 shrink-0">
              <span style={{ color: "var(--text-faint)", marginLeft: 4 }}>→</span>
              {i < path.length - 1 ? (
                <Link
                  href={`/node/${segment.slug}`}
                  style={{ color: "var(--text-mute)", transition: "color 150ms", marginLeft: 4 }}
                  className="hover:text-[var(--tv-text)]"
                >
                  {segment.label.toLowerCase()}
                </Link>
              ) : (
                <span
                  style={{ color: "var(--accent)", fontWeight: 500, marginLeft: 4 }}
                >
                  {segment.label.toLowerCase()}
                </span>
              )}
            </span>
          ))}
        </nav>
      </header>

      {/* ── Node type tag ───────────────────────────────────────────── */}
      <div style={{ padding: "28px 24px 8px", maxWidth: "64rem", margin: "0 auto" }}>
        <div className="flex items-center gap-3">
          <span className="tv-tag">{node.type}</span>
          <span
            style={{
              width: 1,
              height: 10,
              background: "var(--line-2)",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.08em" }}>
            {node.slug}
          </span>
        </div>
      </div>

      {/* ── Content area ────────────────────────────────────────────── */}
      <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "0 24px 80px" }}>
        {children}
      </div>

      {/* ── Children navigation ─────────────────────────────────────── */}
      {node.children && node.children.length > 0 && (
        <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "0 24px 80px" }}>
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 32 }}>
            <div className="tv-tag" style={{ marginBottom: 16 }}>
              // children ({node.children.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {node.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/node/${child.slug}`}
                  className="group block transition-all duration-200"
                  style={{
                    padding: "16px",
                    borderRadius: 8,
                    border: "1px solid var(--line-2)",
                    background: "var(--ink-2)",
                  }}
                >
                  <span className="tv-tag block" style={{ marginBottom: 6 }}>
                    {child.type}
                  </span>
                  <span
                    style={{ fontSize: 13, color: "var(--tv-text)", display: "block", fontWeight: 500 }}
                  >
                    {child.label}
                  </span>
                  {child.content?.summary && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-mute)",
                        display: "block",
                        marginTop: 6,
                        lineHeight: 1.55,
                      }}
                      className={cn("line-clamp-2")}
                    >
                      {child.content.summary}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export type { NodeShellProps };
