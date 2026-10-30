"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Navigator } from "@tv/contract";
import { findNodeBySlug } from "@/data";
import { useTraversalState } from "@/hooks/useTraversalState";
import { AstApp } from "@/targets/ast/AstApp";
import { AstNavProvider } from "@/targets/ast/nav";

// ── /tree ──────────────────────────────────────────────────────────────
// Renders the AST through a Next-backed navigator until the AST mounts
// through the target contract at /t/ast.

function TreePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasHydrated = useTraversalState((s) => s.hasHydrated);
  const visitNode = useTraversalState((s) => s.visitNode);

  const nav = useMemo<Navigator>(
    () => ({
      focus: () => {},
      open: (id) => router.push(`/node/${id}`),
      switchTarget: () => {},
      setParam: (key, value) => {
        const params = new URLSearchParams(window.location.search);
        if (value === null) params.delete(key);
        else params.set(key, value);
        const query = params.toString();
        router.replace(query ? `/tree?${query}` : "/tree", { scroll: false });
      },
      external: (url) => {
        window.open(url, "_blank", "noopener,noreferrer");
      },
    }),
    [router]
  );

  const params = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    const mode = searchParams.get("mode");
    if (mode !== null) out.mode = mode;
    return out;
  }, [searchParams]);

  // ── Share URL: restore visited nodes from ?traversal=a,b,c ─────────
  const hasRestoredTraversal = useRef(false);
  useEffect(() => {
    if (!hasHydrated || hasRestoredTraversal.current) return;
    const traversalParam = searchParams.get("traversal");
    if (!traversalParam) return;
    hasRestoredTraversal.current = true;

    const next = new URLSearchParams(searchParams.toString());
    next.delete("traversal");
    router.replace(next.toString() ? `/tree?${next.toString()}` : "/tree", { scroll: false });

    for (const slug of traversalParam.split(",").filter(Boolean)) {
      const result = findNodeBySlug(slug);
      if (result) {
        const { node } = result;
        visitNode(node.slug, node.label, node.type, node.glowColor);
      }
    }
  }, [hasHydrated, searchParams, router, visitNode]);

  return (
    <AstNavProvider value={nav}>
      <AstApp
        params={params}
        home={
          <Link
            href="/"
            style={{ fontSize: 12, color: "var(--text-faint)", fontFamily: "var(--mono)", transition: "color 150ms" }}
            className="hover:text-[var(--tv-text)]"
          >
            ← root
          </Link>
        }
      />
    </AstNavProvider>
  );
}

// useSearchParams requires a Suspense boundary.
export default function TreePage() {
  return (
    <Suspense
      fallback={
        <main
          className="flex items-center justify-center h-screen"
          style={{ background: "var(--ink)" }}
        >
          <div className="font-mono text-sm animate-pulse" style={{ color: "var(--text-faint)" }}>
            loading AST...
          </div>
        </main>
      }
    >
      <TreePageInner />
    </Suspense>
  );
}
