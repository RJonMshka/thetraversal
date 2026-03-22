"use client";

import { useState, useCallback } from "react";
import { Cursor } from "@/components/landing/Cursor";
import { ParseAnimation } from "@/components/landing/ParseAnimation";

export default function LandingPage() {
  const [showAnimation, setShowAnimation] = useState(false);

  const handleNavigate = useCallback(() => {
    setShowAnimation(true);
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen relative">
      {/* Ambient glow — subtle background effect */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-ctp-mauve/[0.03] blur-3xl animate-glow-pulse" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full">
        {!showAnimation ? (
          <Cursor onNavigate={handleNavigate} />
        ) : (
          <ParseAnimation isActive={showAnimation} />
        )}
      </div>

      {/* No-JS fallback */}
      <noscript>
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-ctp-base text-ctp-text font-mono z-50">
          <h1 className="text-xl mb-4">The Traversal</h1>
          <p className="text-ctp-subtext0 mb-6 text-center max-w-md px-4">
            An interactive AST-based developer portfolio by Rajat Kumar.
          </p>
          <a
            href="/tree"
            className="px-4 py-2 border border-ctp-surface1 text-ctp-green hover:border-ctp-green transition-colors"
          >
            Begin Traversal
          </a>
        </div>
      </noscript>
    </main>
  );
}
