"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { findNodeBySlug } from "@/data";

// ── Glow resolution ────────────────────────────────────────────────────
// Maps the AST node's glowColor CSS-var name → hex for inline styling.

const GLOW_HEX: Record<string, string> = {
  "--ctp-text":      "#e6e4dd",
  "--ctp-yellow":    "#f9e2af",
  "--ctp-peach":     "#fab387",
  "--ctp-mauve":     "#cba6f7",
  "--ctp-teal":      "#94e2d5",
  "--ctp-lavender":  "#b4befe",
  "--ctp-green":     "#a6e3a1",
  "--ctp-red":       "#f38ba8",
  "--ctp-blue":      "#89b4fa",
  "--ctp-sky":       "#89dceb",
  "--ctp-pink":      "#f5c2e7",
  "--ctp-rosewater": "#f5e0dc",
  "--ctp-flamingo":  "#f2cdcd",
  "--ctp-maroon":    "#eba0ac",
  "--ctp-sapphire":  "#74c7ec",
};

function resolveGlow(glowColor: string): string {
  return GLOW_HEX[glowColor] ?? "var(--accent)";
}

// ── Props ──────────────────────────────────────────────────────────────

interface NodeInspectorProps {
  slug: string | null;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────

export function NodeInspector({ slug, onClose }: NodeInspectorProps) {
  const result = slug ? findNodeBySlug(slug) : null;
  const node = result?.node ?? null;
  const path = result?.path ?? [];

  return (
    <AnimatePresence>
      {node && (
        <motion.aside
          key={node.slug}
          initial={{ x: 288 }}
          animate={{ x: 0 }}
          exit={{ x: 288 }}
          transition={{ type: "spring", stiffness: 340, damping: 34 }}
          aria-label={`Node inspector: ${node.label}`}
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 288,
            background: "var(--ink-2)",
            borderLeft: "1px solid var(--line)",
            overflowY: "auto",
            zIndex: 25,
            fontFamily: "var(--mono)",
          }}
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <div
            style={{
              padding: "14px 16px 12px",
              borderBottom: "1px solid var(--line)",
              position: "sticky",
              top: 0,
              background: "var(--ink-2)",
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span className="tv-tag">{node.type}</span>
              <button
                onClick={onClose}
                aria-label="Close inspector"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-faint)",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                  padding: "2px 4px",
                  transition: "color 150ms",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color =
                    "var(--tv-text)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color =
                    "var(--text-faint)")
                }
              >
                ×
              </button>
            </div>

            {/* Label */}
            <div
              style={{
                marginTop: 10,
                fontSize: 15,
                fontWeight: 600,
                color: resolveGlow(node.glowColor),
                letterSpacing: "-0.01em",
              }}
            >
              {node.label}
            </div>

            {/* AST path breadcrumb */}
            {path.length > 0 && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 10,
                  color: "var(--text-faint)",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 3,
                  lineHeight: 1.6,
                }}
              >
                <span>Program</span>
                {path.map((seg) => (
                  <span
                    key={seg.id}
                    style={{ display: "flex", alignItems: "center", gap: 3 }}
                  >
                    <span style={{ color: "var(--line-2)", fontSize: 9 }}>→</span>
                    <span>{seg.label.toLowerCase()}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Body ─────────────────────────────────────────────────── */}
          <div style={{ padding: "16px" }}>
            {/* Slug */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--text-faint)",
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                IDENTIFIER
              </div>
              <code style={{ fontSize: 11, color: "var(--type)" }}>
                {node.slug}
              </code>
            </div>

            {/* Summary */}
            {node.content?.summary && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--text-faint)",
                    letterSpacing: "0.08em",
                    marginBottom: 6,
                  }}
                >
                  SUMMARY
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-mute)",
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {node.content.summary}
                </p>
              </div>
            )}

            {/* Params (tech stack) */}
            {node.meta?.params && node.meta.params.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--text-faint)",
                    letterSpacing: "0.08em",
                    marginBottom: 6,
                  }}
                >
                  PARAMS
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--string)",
                    lineHeight: 1.7,
                  }}
                >
                  ({node.meta.params.join(", ")})
                </div>
              </div>
            )}

            {/* Tags */}
            {node.meta?.tags && node.meta.tags.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--text-faint)",
                    letterSpacing: "0.08em",
                    marginBottom: 6,
                  }}
                >
                  TAGS
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {node.meta.tags.map((tag) => (
                    <span key={tag} className="tv-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {node.meta?.links && node.meta.links.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--text-faint)",
                    letterSpacing: "0.08em",
                    marginBottom: 6,
                  }}
                >
                  LINKS
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {node.meta.links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 11,
                        color: resolveGlow(node.glowColor),
                        textDecoration: "underline",
                        textUnderlineOffset: 3,
                        opacity: 0.8,
                        transition: "opacity 150ms",
                      }}
                    >
                      {link.label} ↗
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Children */}
            {node.children && node.children.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--text-faint)",
                    letterSpacing: "0.08em",
                    marginBottom: 6,
                  }}
                >
                  CHILDREN ({node.children.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {node.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/node/${child.slug}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 10px",
                        border: "1px solid var(--line)",
                        borderRadius: 4,
                        fontSize: 11,
                        color: "var(--tv-text)",
                        transition: "border-color 150ms",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          color: "var(--text-faint)",
                          minWidth: 20,
                        }}
                      >
                        {child.type.replace(/Node|Declaration|Expression|Statement/, "").toUpperCase() || child.type.slice(0, 3).toUpperCase()}
                      </span>
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Open button */}
            <Link
              href={`/node/${node.slug}`}
              style={{
                display: "block",
                marginTop: 24,
                padding: "9px 14px",
                border: `1px solid ${resolveGlow(node.glowColor)}`,
                borderRadius: 5,
                color: resolveGlow(node.glowColor),
                fontSize: 11,
                textAlign: "center",
                fontFamily: "var(--mono)",
                transition: "background 150ms",
              }}
            >
              → open node
            </Link>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
