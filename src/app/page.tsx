"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Cursor } from "@/components/landing/Cursor";
import { ParseAnimation } from "@/components/landing/ParseAnimation";

const MODES = [
  { label: "— lex",   href: "/tree?mode=lex"   },
  { label: "— parse", href: "/tree?mode=parse" },
  { label: "— eval",  href: "/tree?mode=eval"  },
];

// ── Mini-tree sneak peek ───────────────────────────────────────────────
// Pure SVG so it scales naturally to any container width.

// Mini AST preview — 4 level-1 nodes (no overlap), 2 glowing leaves under Timeline.
// Geometry:
//   viewBox 400×170 · root centered at x=200
//   Level 1: centers at 65, 155, 245, 335  (90px gap, box width 70 → 20px gutter)
//   Level 2: centers at 210, 290 under Timeline  (box width 62 → 18px gutter)
function TreeSneakPeek() {
  const ACCENT = "var(--accent)";
  const ACCENT_FAINT = "var(--accent-faint)";
  const ACCENT_DIM = "var(--accent-dim)";
  const DIM_FILL = "rgba(255,255,255,0.02)";
  const DIM_STROKE = "var(--line)";
  const DIM_TEXT = "var(--text-mute)";
  const ROOT_FILL = "var(--ink-2)";
  const ROOT_STROKE = "var(--line-2)";
  const font = '"JetBrains Mono", ui-monospace, monospace';

  // Level-1 nodes
  const L1: { cx: number; label: string; glow?: boolean; dim?: boolean }[] = [
    { cx: 65,  label: "Identity", dim: true  },
    { cx: 155, label: "Skills",   dim: true  },
    { cx: 245, label: "Timeline", glow: true },
    { cx: 335, label: "Connect",  dim: true  },
  ];

  // Leaf nodes (under Timeline cx=245)
  const LEAVES: { cx: number; label: string }[] = [
    { cx: 210, label: "Journey"     },
    { cx: 290, label: "Capital One" },
  ];

  return (
    <div className="tv-card" style={{ padding: 18, overflow: "hidden" }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <span className="tv-tag">// preview · /tree</span>
        <span
          style={{
            fontSize: 10,
            color: "var(--text-faint)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--mono)",
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: 999, background: ACCENT, display: "inline-block" }} />
          <span style={{ color: ACCENT }}>57 nodes</span>
          <span>· depth 4</span>
        </span>
      </div>

      {/* SVG tree */}
      <svg viewBox="0 0 400 170" style={{ width: "100%", height: "auto", display: "block" }} aria-hidden="true">
        {/* root → level-1 edges */}
        {L1.map((n) => (
          <path
            key={n.label}
            d={`M200,32 C200,58 ${n.cx},58 ${n.cx},72`}
            stroke={n.glow ? ACCENT : "rgba(255,255,255,0.10)"}
            strokeWidth={n.glow ? 1.2 : 0.7}
            fill="none"
            opacity={n.glow ? 0.75 : 0.4}
          />
        ))}

        {/* timeline → leaf edges */}
        {LEAVES.map((n) => (
          <path
            key={n.label}
            d={`M245,90 C245,114 ${n.cx},114 ${n.cx},126`}
            stroke={ACCENT}
            strokeWidth="0.9"
            fill="none"
            opacity="0.55"
          />
        ))}

        {/* root node */}
        <rect x="155" y="10" width="90" height="22" rx="3" fill={ROOT_FILL} stroke={ROOT_STROKE} />
        <text x="200" y="24" textAnchor="middle" fontFamily={font} fontSize="9" fill="var(--tv-text)">
          Rajat Kumar
        </text>

        {/* level-1 nodes */}
        {L1.map((n) => (
          <g key={n.label} opacity={n.dim ? 0.5 : 1}>
            <rect
              x={n.cx - 35} y="72" width="70" height="18" rx="3"
              fill={n.glow ? ACCENT_FAINT : DIM_FILL}
              stroke={n.glow ? ACCENT : DIM_STROKE}
            />
            <text x={n.cx} y="84" textAnchor="middle" fontFamily={font} fontSize="8"
              fill={n.glow ? ACCENT : DIM_TEXT}>
              {n.label}
            </text>
          </g>
        ))}

        {/* leaf nodes */}
        {LEAVES.map((n) => (
          <g key={n.label}>
            <rect
              x={n.cx - 31} y="126" width="62" height="16" rx="2"
              fill={ACCENT_FAINT} stroke={ACCENT_DIM}
            />
            <text x={n.cx} y="137" textAnchor="middle" fontFamily={font} fontSize="7" fill={ACCENT}>
              {n.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Footer */}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid var(--line)",
          paddingTop: 10,
        }}
      >
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-faint)" }}>
          press <span style={{ color: ACCENT }}>↵</span> to enter
        </span>
        <Link href="/tree" style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-mute)" }}>
          traverse →
        </Link>
      </div>
    </div>
  );
}

// ── Landing Page ───────────────────────────────────────────────────────

export default function LandingPage() {
  const [showAnimation, setShowAnimation] = useState(false);

  const handleNavigate = useCallback(() => {
    setShowAnimation(true);
  }, []);

  if (showAnimation) {
    return (
      <main
        id="main-content"
        className="flex flex-col items-center justify-center min-h-screen"
        style={{ background: "var(--ink)" }}
      >
        <ParseAnimation isActive />
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="min-h-screen relative overflow-hidden"
      style={{ background: "var(--ink)", fontFamily: "var(--mono)", color: "var(--tv-text)" }}
    >
      {/* Dot grid + radial gradient overlay */}
      <div
        className="tv-dotgrid absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 70%, #0f1318 0%, var(--ink) 60%)" }}
        aria-hidden="true"
      />

      <div
        className="relative z-10 flex flex-col min-h-screen"
        style={{ padding: "clamp(20px, 4vw, 36px) clamp(20px, 5vw, 56px)" }}
      >
        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div style={{ fontSize: 11, color: "var(--text-faint)", letterSpacing: "0.16em" }}>
            TRAVERSAL · v2.0 · BUILD{" "}
            <span style={{ color: "var(--accent)" }}>2026.04</span>
          </div>

          <div className="flex items-center gap-3">
            {/* ● LIVE — mobile only */}
            <span
              className="flex lg:hidden items-center gap-1.5"
              style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em" }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 999,
                  background: "var(--accent)",
                  display: "inline-block",
                }}
              />
              LIVE
            </span>

            {/* Mode chips — hidden on very small screens */}
            <nav className="hidden sm:flex gap-2" aria-label="Traversal modes">
              {MODES.map((m, i) => (
                <Link key={m.label} href={m.href}>
                  <span className="tv-chip" data-on={i === 2 ? "true" : undefined}>
                    {m.label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* ── Hero — responsive grid ────────────────────────────────────── */}
        {/* Mobile: single column. Desktop lg+: 1.3fr / 1fr side-by-side. */}
        <div
          className="flex-1 mt-10 lg:mt-16 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-10 lg:gap-16"
          style={{ alignItems: "start" }}
        >
          {/* Left column: identity + REPL */}
          <div>
            <div className="tv-tag" style={{ marginBottom: 18 }}>
              // node[0] · root
            </div>

            <h1
              style={{
                fontFamily: "var(--serif)",
                fontSize: "clamp(44px, 10vw, 88px)",
                lineHeight: 0.96,
                fontWeight: 400,
                letterSpacing: "-0.02em",
                margin: 0,
                color: "var(--tv-text)",
              }}
            >
              Rajat{" "}
              <span style={{ fontStyle: "italic", color: "var(--accent)" }}>Kumar</span>.
            </h1>

            <p
              style={{
                fontSize: "clamp(12px, 1.5vw, 14px)",
                color: "var(--text-mute)",
                lineHeight: 1.7,
                marginTop: 26,
                maxWidth: 520,
              }}
            >
              Senior software engineer. AI, compilers, distributed systems,
              <br />
              and the parts of the frontend most engineers won&apos;t touch.
            </p>

            {/* REPL input */}
            <div
              style={{
                marginTop: 48,
                background: "var(--ink-2)",
                border: "1px solid var(--line-2)",
                borderRadius: 8,
                padding: "16px 20px",
                maxWidth: 560,
              }}
            >
              <Cursor onNavigate={handleNavigate} embedded />
            </div>

            <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 14 }}>
              type anything and press{" "}
              <span style={{ color: "var(--accent)" }}>enter</span> · or{" "}
              <Link
                href="/tree"
                style={{
                  color: "var(--text-mute)",
                  textDecoration: "underline",
                  textUnderlineOffset: 4,
                }}
              >
                traverse →
              </Link>
            </p>
          </div>

          {/* Right column: tree sneak peek — desktop only */}
          <div className="hidden lg:block">
            <TreeSneakPeek />
          </div>
        </div>

        {/* ── Mobile: tree sneak peek below hero ───────────────────────── */}
        <div className="lg:hidden mt-8">
          <TreeSneakPeek />
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div
          className="flex items-end justify-between flex-wrap gap-2"
          style={{ marginTop: 48, paddingTop: 24 }}
        >
          <div style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.14em", lineHeight: 1.9 }}>
            STREAM →{" "}
            <span style={{ color: "var(--text-mute)" }}>&quot;Publicis Sapient&quot;</span>
            {" → "}
            <span style={{ color: "var(--text-mute)" }}>&quot;UIC&quot;</span>
            {" → "}
            <span style={{ color: "var(--text-mute)" }}>&quot;Airblox&quot;</span>
            {" → "}
            <span style={{ color: "var(--accent)" }}>&quot;Capital One&quot;</span>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-faint)" }}>
            chicago · shipping
          </div>
        </div>
      </div>

      {/* No-JS fallback */}
      <noscript>
        <div
          className="fixed inset-0 flex flex-col items-center justify-center z-50"
          style={{ background: "var(--ink)", color: "var(--tv-text)", fontFamily: "var(--mono)" }}
        >
          <h1 style={{ fontSize: 20, marginBottom: 16 }}>The Traversal</h1>
          <p
            style={{
              color: "var(--text-mute)",
              marginBottom: 24,
              textAlign: "center",
              maxWidth: 400,
              padding: "0 16px",
            }}
          >
            An interactive AST-based developer portfolio by Rajat Kumar.
          </p>
          <a
            href="/tree"
            style={{
              padding: "10px 20px",
              border: "1px solid var(--line-2)",
              color: "var(--accent)",
            }}
          >
            Begin Traversal
          </a>
        </div>
      </noscript>
    </main>
  );
}
