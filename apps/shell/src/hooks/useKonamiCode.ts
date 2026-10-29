"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const KONAMI_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

/**
 * Detects the Konami code sequence (Up Up Down Down Left Right Left Right B A).
 * Returns `isActive` which is true for `duration` ms after the code is entered.
 */
export function useKonamiCode(duration = 10000) {
  const [isActive, setIsActive] = useState(false);
  const sequenceRef = useRef<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activate = useCallback(() => {
    setIsActive(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsActive(false);
    }, duration);
  }, [duration]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      sequenceRef.current.push(key);

      // Only keep the last N keys where N = sequence length
      if (sequenceRef.current.length > KONAMI_SEQUENCE.length) {
        sequenceRef.current = sequenceRef.current.slice(
          -KONAMI_SEQUENCE.length
        );
      }

      // Check for match
      if (
        sequenceRef.current.length === KONAMI_SEQUENCE.length &&
        sequenceRef.current.every((k, i) => k === KONAMI_SEQUENCE[i])
      ) {
        sequenceRef.current = [];
        activate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activate]);

  return isActive;
}
