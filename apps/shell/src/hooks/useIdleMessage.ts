"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Shows a message after the user has been idle for `idleMs` milliseconds.
 * Resets on any user interaction (mouse, keyboard, touch, scroll).
 */
export function useIdleMessage(idleMs = 30000) {
  const [showMessage, setShowMessage] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const resetTimer = () => {
      setShowMessage(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setShowMessage(true);
      }, idleMs);
    };

    // Start the timer
    resetTimer();

    // Reset on any interaction
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    for (const event of events) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of events) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [idleMs]);

  return showMessage;
}
