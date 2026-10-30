"use client";

import { Suspense } from "react";
import { AstApp } from "@/targets/ast/AstApp";

// useSearchParams inside AstApp requires a Suspense boundary.
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
      <AstApp />
    </Suspense>
  );
}
