"use client";

import Link from "next/link";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { getGlowClasses } from "@/lib/glow";
import { useTraversalState } from "@/hooks/useTraversalState";
import type { ASTNode, ASTPath } from "@/lib/ast-types";

interface NodeShellProps {
  node: ASTNode;
  path: ASTPath;
  children: React.ReactNode;
}

export function NodeShell({ node, path, children }: NodeShellProps) {
  const visitNode = useTraversalState((s) => s.visitNode);

  // Mark node as visited on mount
  useEffect(() => {
    visitNode(node.slug, node.label, node.type);
  }, [node.slug, node.label, node.type, visitNode]);

  const glow = getGlowClasses(node.glowColor);

  return (
    <main className="min-h-screen bg-ctp-base">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-10 flex items-center gap-4 px-4 py-3 border-b border-ctp-surface0 bg-ctp-mantle/80 backdrop-blur-sm">
        <Link
          href="/tree"
          className="text-ctp-overlay1 hover:text-ctp-text text-sm font-mono transition-colors shrink-0"
        >
          {"<-"} tree
        </Link>

        {/* Breadcrumb trail */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs font-mono overflow-x-auto">
          {path.map((segment, i) => (
            <span key={segment.id} className="flex items-center gap-1 shrink-0">
              {i > 0 && <span className="text-ctp-overlay0">{">"}</span>}
              {i < path.length - 1 ? (
                <Link
                  href={`/node/${segment.slug}`}
                  className="text-ctp-overlay1 hover:text-ctp-text transition-colors"
                >
                  {segment.label}
                </Link>
              ) : (
                <span className={cn("font-medium", glow.text)}>
                  {segment.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      </header>

      {/* Node type badge */}
      <div className="px-4 pt-6 pb-2 max-w-4xl mx-auto">
        <span className="text-xs font-mono text-ctp-overlay0">
          {node.type}
        </span>
      </div>

      {/* Content area */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        {children}
      </div>

      {/* Children navigation (if node has children) */}
      {node.children && node.children.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-16">
          <div className="border-t border-ctp-surface0 pt-8">
            <h2 className="text-sm font-mono text-ctp-overlay0 mb-4">
              // children ({node.children.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {node.children.map((child) => {
                const childGlow = getGlowClasses(child.glowColor);
                return (
                  <Link
                    key={child.id}
                    href={`/node/${child.slug}`}
                    className={cn(
                      "group block p-4 rounded-lg border transition-all duration-200",
                      "bg-ctp-surface0/30 hover:bg-ctp-surface0/60",
                      childGlow.border,
                      "hover:shadow-lg",
                      childGlow.shadow,
                    )}
                  >
                    <span className="text-[10px] font-mono text-ctp-overlay0 block mb-1">
                      {child.type}
                    </span>
                    <span className={cn(
                      "text-sm font-mono font-medium block",
                      childGlow.text,
                    )}>
                      {child.label}
                    </span>
                    {child.content?.summary && (
                      <span className="text-xs text-ctp-subtext0 block mt-1 line-clamp-2">
                        {child.content.summary}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export type { NodeShellProps };
