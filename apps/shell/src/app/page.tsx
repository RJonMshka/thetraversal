"use client";

import { TelemetryNote } from "@/components/shared/TelemetryNote";
import { Suspense, useState, useCallback } from "react";
import Link from "next/link";
import { Cursor } from "@/components/landing/Cursor";
import { FlavorPicker } from "@/components/landing/FlavorPicker";
import { preloadable, usePreloadWhenIdle } from "@/lib/preloadable";
import { ir } from "@/platform/ir";
import type { Entity } from "@tv/ir";

const SECTIONS = ir.children(ir.graph.rootId);

/** "University of Illinois at Chicago" → "UIC"; short labels stay. */
function shortLabel(label: string): string {
  if (label.length <= 18) return label;
  return label.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).join("");
}

// The career stream in the footer: every leaf under a timeline, in order.
const STREAM: Entity[] = [];
function collectLeaves(id: string) {
  for (const k of ir.children(id)) {
    if (ir.children(k.id).length === 0) STREAM.push(k);
    else collectLeaves(k.id);
  }
}
for (const t of ir.byKind("timeline")) if (ir.parent(t.id)?.kind !== "timeline") collectLeaves(t.id);

// Shown only after the visitor runs the prompt; its code (and Framer
// Motion) loads when the page is idle, so it is not first-load JS.
const Parse = preloadable(() => import("@/components/landing/ParseAnimation").then((m) => m.ParseAnimation));

const MODES = [
  { label: "— lex",   href: "/t/ast?mode=lex"   },
  { label: "— parse", href: "/t/ast?mode=parse" },
  { label: "— eval",  href: "/t/ast?mode=eval"  },
];

// ── Landing Page ───────────────────────────────────────────────────────

export default function LandingPage() {
  const [showAnimation, setShowAnimation] = useState(false);
  usePreloadWhenIdle(Parse.preload);

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
        <Suspense fallback={null}>
          <Parse.Component isActive />
        </Suspense>
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
            <span style={{ color: "var(--accent)" }}>2026.11</span>
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
              {"// node[0] · root"}
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
              I build systems that think — and think about systems that build.
              <br />
              Senior software engineer. Compilers, AI engineering, and the
              parts of the frontend most engineers won&apos;t touch.
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

            {/* Every section, one click from the root */}
            <nav aria-label="Sections" className="mt-5 flex max-w-[560px] flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
              <span className="text-ctp-overlay0">root.contains →</span>
              {SECTIONS.map((s) => (
                <Link
                  key={s.id}
                  href={`/node/${s.id}`}
                  className="text-ctp-subtext0 underline decoration-[var(--line-2)] underline-offset-4 hover:text-ctp-green hover:decoration-current"
                >
                  {s.id}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right column on desktop, below the prompt on phones */}
          <FlavorPicker />
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div
          className="flex items-end justify-between flex-wrap gap-2"
          style={{ marginTop: 48, paddingTop: 24 }}
        >
          <nav aria-label="Career stream" style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.14em", lineHeight: 1.9 }}>
            STREAM
            {STREAM.map((e, i) => (
              <span key={e.id}>
                {" → "}
                <Link
                  href={`/node/${e.id}`}
                  title={e.label}
                  className={`hover:underline underline-offset-4 ${i === STREAM.length - 1 ? "text-ctp-green" : "text-ctp-subtext0"}`}
                >
                  &quot;{shortLabel(e.label)}&quot;
                </Link>
              </span>
            ))}
          </nav>
          <div style={{ fontSize: 10, color: "var(--text-faint)" }}>
            chicago · shipping
          </div>
        </div>
        {process.env.TV_INGEST === "1" && <TelemetryNote className="mt-3" />}
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
          <Link
            href="/t/ast"
            style={{
              padding: "10px 20px",
              border: "1px solid var(--line-2)",
              color: "var(--accent)",
            }}
          >
            Begin Traversal
          </Link>
        </div>
      </noscript>
    </main>
  );
}
