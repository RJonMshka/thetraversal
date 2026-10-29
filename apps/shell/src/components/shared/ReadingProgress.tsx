"use client";

import { useEffect, useState } from "react";

// ── Reading progress bar ───────────────────────────────────────────────
// A thin bar at the top of the essay that fills as the reader scrolls.
// CSS-driven via scroll percentage, no IntersectionObserver overhead.

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setProgress(100);
        return;
      }
      setProgress(Math.min(100, (scrollTop / docHeight) * 100));
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // initial

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-0.5 z-50 pointer-events-none"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    >
      <div
        className="h-full bg-ctp-lavender transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
