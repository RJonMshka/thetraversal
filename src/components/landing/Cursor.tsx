"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getEasterEgg, isNavigationCommand, type EasterEggResult } from "@/lib/easter-eggs";

interface HistoryEntry {
  input: string;
  output: EasterEggResult | null;
}

interface CursorProps {
  onNavigate: () => void;
}

export function Cursor({ onNavigate }: CursorProps) {
  const [input, setInput] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show hint after a delay so non-devs get guidance
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!input.trim()) return;

    const trimmed = input.trim();

    // Check for clear command
    if (trimmed === "clear") {
      setHistory([]);
      setInput("");
      setCursorPos(0);
      return;
    }

    // Check for easter egg
    const easterEgg = getEasterEgg(trimmed);

    if (easterEgg) {
      setHistory((prev) => [...prev, { input: trimmed, output: easterEgg }]);
      setInput("");
      setCursorPos(0);
      return;
    }

    // If it's a navigation command (anything else), trigger parse animation
    if (isNavigationCommand(trimmed)) {
      setIsActive(false);
      setHistory((prev) => [...prev, { input: trimmed, output: null }]);
      setInput("");
      setCursorPos(0);
      // Small delay before triggering navigation/animation
      setTimeout(() => {
        onNavigate();
      }, 100);
    }
  }, [input, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;

      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, handleSubmit]);

  // Auto-focus the hidden input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll to bottom on new history entries
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history]);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-start w-full max-w-2xl mx-auto px-6 overflow-y-auto max-h-[80vh]"
      onClick={focusInput}
      role="log"
      aria-label="Terminal"
      aria-live="polite"
    >
      {/* History */}
      {history.map((entry, i) => (
        <div key={i} className="w-full mb-2">
          {/* Input line */}
          <div className="flex items-center gap-2 font-mono text-sm">
            <span className="text-ctp-green select-none">{">"}</span>
            <span className="text-ctp-text">{entry.input}</span>
          </div>

          {/* Output */}
          {entry.output && (
            <div className="mt-1 ml-4 animate-fade-in">
              {entry.output.type === "json" && (
                <pre className="text-ctp-peach text-xs leading-relaxed whitespace-pre font-mono">
                  {entry.output.content as string}
                </pre>
              )}
              {entry.output.type === "text" && (
                <p className="text-ctp-subtext0 text-sm font-mono">
                  {entry.output.content as string}
                </p>
              )}
              {entry.output.type === "lines" && (
                <div className="text-ctp-subtext0 text-sm font-mono">
                  {(entry.output.content as string[]).map((line, j) => (
                    <p key={j} className={cn(line === "" ? "h-3" : "")}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Active input line */}
      {isActive && (
        <>
          <div className="flex items-center gap-2 font-mono text-sm w-full">
            <span className="text-ctp-green select-none">{">"}</span>
            <div className="relative flex-1">
              {/* Hidden input for actual text capture */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setCursorPos(e.target.selectionStart ?? e.target.value.length);
                }}
                onKeyUp={(e) => {
                  setCursorPos(e.currentTarget.selectionStart ?? cursorPos);
                }}
                onSelect={(e) => {
                  setCursorPos(e.currentTarget.selectionStart ?? cursorPos);
                }}
                className="absolute inset-0 w-full bg-transparent text-ctp-text outline-none caret-transparent font-mono text-sm"
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label="Terminal input"
              />
              {/* Visible text with cursor at correct position */}
              <span className="text-ctp-text pointer-events-none select-none">
                {input.slice(0, cursorPos)}
              </span>
              <span
                className={cn(
                  "inline-block w-[0.6em] h-[1.1em] bg-ctp-text align-middle",
                  "animate-cursor-blink"
                )}
                aria-hidden="true"
              />
              <span className="text-ctp-text pointer-events-none select-none">
                {input.slice(cursorPos)}
              </span>
            </div>
          </div>

          {/* Hint for non-devs — fades in after delay */}
          {showHint && history.length === 0 && (
            <div className="mt-6 animate-fade-in space-y-2">
              <p className="text-ctp-overlay0 text-xs font-mono">
                type anything and press <span className="text-ctp-subtext0">Enter</span> to begin
              </p>
              <p className="text-ctp-overlay0/60 text-xs font-mono">
                or try: <span className="text-ctp-subtext0">help</span>
                {" \u00B7 "}
                <span className="text-ctp-subtext0">ls</span>
                {" \u00B7 "}
                <span className="text-ctp-subtext0">console.log(rajat)</span>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
