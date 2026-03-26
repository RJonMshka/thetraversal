"use client";

import { useRef, useState, useCallback } from "react";

/**
 * Tracks consecutive clicks on a specific slug. When `threshold` clicks
 * are reached, activates a "stack overflow" state for `duration` ms.
 * Clicks must happen within `window` ms of each other to count.
 */
export function useStackOverflow(
  targetSlug: string,
  threshold = 5,
  duration = 2000,
  windowMs = 1500
) {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const clickCountRef = useRef(0);
  const lastClickRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const registerClick = useCallback(
    (slug: string) => {
      if (slug !== targetSlug || isOverflowing) return;

      const now = Date.now();
      if (now - lastClickRef.current > windowMs) {
        // Too long between clicks — reset counter
        clickCountRef.current = 0;
      }

      clickCountRef.current += 1;
      lastClickRef.current = now;

      if (clickCountRef.current >= threshold) {
        clickCountRef.current = 0;
        setIsOverflowing(true);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setIsOverflowing(false);
        }, duration);
      }
    },
    [targetSlug, threshold, duration, windowMs, isOverflowing]
  );

  return { isOverflowing, registerClick };
}
