"use client";

import Link from "next/link";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useShellStore } from "@/state/shell-store";
import type { Entity } from "@tv/ir";
import { KIND_TAG } from "@/lib/kind-label";
import { targetHref } from "@/platform/focus";
import { DEFAULT_TARGET, isTargetId } from "@/platform/registry";

interface NodeShellProps {
  entity: Entity;
  /** Root → this entity. */
  path: Pick<Entity, "id" | "label">[];
  /** Ordered contains children. */
  childEntities: Entity[];
  children: React.ReactNode;
}

export function NodeShell({ entity, path, childEntities, children }: NodeShellProps) {
  const visit = useShellStore((s) => s.visit);
  // Back to the target the visitor came from, focused on this node. The
  // server render (and hydration) uses the default target.
  const lastTarget = useShellStore((s) => s.lastTarget);
  const backTarget = lastTarget && isTargetId(lastTarget) ? lastTarget : DEFAULT_TARGET;

  useEffect(() => {
    visit({ id: entity.id, label: entity.label, kind: entity.kind });
  }, [entity.id, entity.label, entity.kind, visit]);

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
          background: "color-mix(in srgb, var(--ink) 88%, transparent)",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Back link */}
        <Link
          href={targetHref(backTarget, { focus: entity.id })}
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
          <span style={{ color: "var(--text-mute)" }}>Program</span>
          {path.map((segment, i) => (
            <span key={segment.id} className="flex items-center gap-1 shrink-0">
              <span style={{ color: "var(--text-mute)", marginLeft: 4 }}>→</span>
              {i < path.length - 1 ? (
                <Link
                  href={`/node/${segment.id}`}
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
          <span className="tv-tag">{KIND_TAG[entity.kind]}</span>
          <span
            style={{
              width: 1,
              height: 10,
              background: "var(--line-2)",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.08em" }}>
            {entity.id}
          </span>
        </div>
      </div>

      {/* ── Content area ────────────────────────────────────────────── */}
      <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "0 24px 80px" }}>
        {children}
      </div>

      {/* ── Children navigation ─────────────────────────────────────── */}
      {childEntities.length > 0 && (
        <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "0 24px 80px" }}>
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 32 }}>
            <div className="tv-tag" style={{ marginBottom: 16 }}>
              {"// children ("}{childEntities.length}{")"}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {childEntities.map((child) => (
                <Link
                  key={child.id}
                  href={`/node/${child.id}`}
                  className="group block transition-all duration-200"
                  style={{
                    padding: "16px",
                    borderRadius: 8,
                    border: "1px solid var(--line-2)",
                    background: "var(--ink-2)",
                  }}
                >
                  <span className="tv-tag block" style={{ marginBottom: 6 }}>
                    {KIND_TAG[child.kind]}
                  </span>
                  <span
                    style={{ fontSize: 13, color: "var(--tv-text)", display: "block", fontWeight: 500 }}
                  >
                    {child.label}
                  </span>
                  {child.summary && (
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
                      {child.summary}
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
