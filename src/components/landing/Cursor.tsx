"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getEasterEgg, isNavigationCommand, type EasterEggResult } from "@/lib/easter-eggs";
import {
  THEMES,
  FONTS,
  loadPersistedTheme,
  applyTheme,
  parseThemeCmd,
  type ThemeName,
  type FontName,
} from "@/lib/themes";

interface HistoryEntry {
  input: string;
  output: EasterEggResult | null;
}

interface CursorProps {
  onNavigate: () => void;
  /** Embed in a parent container — removes max-width, auto-margin, and max-height */
  embedded?: boolean;
}

export function Cursor({ onNavigate, embedded = false }: CursorProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeName>("mint");
  const [activeFont, setActiveFont] = useState<FontName>("mono");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show hint after a delay so non-devs get guidance
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Load persisted theme on mount
  useEffect(() => {
    const { theme, font } = loadPersistedTheme();
    setActiveTheme(theme);
    setActiveFont(font);
  }, []);

  // Live-apply theme as user types a valid theme/font command
  useEffect(() => {
    if (!input.trim()) return;
    const cmd = parseThemeCmd(input);
    if (!cmd.valid) return;

    if (cmd.type === "theme" && cmd.theme && cmd.theme !== activeTheme) {
      applyTheme(cmd.theme, activeFont);
      setActiveTheme(cmd.theme);
    } else if (cmd.type === "font" && cmd.font && cmd.font !== activeFont) {
      applyTheme(activeTheme, cmd.font);
      setActiveFont(cmd.font);
    } else if (cmd.type === "reset") {
      applyTheme("mint", "mono");
      setActiveTheme("mint");
      setActiveFont("mono");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

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

    // Check for theme/font/reset commands
    const themeCmd = parseThemeCmd(trimmed);
    if (themeCmd.type === "theme" || themeCmd.type === "font" || themeCmd.type === "reset") {
      let confirmText = "";
      if (themeCmd.type === "theme" && themeCmd.theme) {
        applyTheme(themeCmd.theme, activeFont);
        setActiveTheme(themeCmd.theme);
        confirmText = `✓ theme → ${themeCmd.theme} · ${THEMES[themeCmd.theme].label}`;
      } else if (themeCmd.type === "font" && themeCmd.font) {
        applyTheme(activeTheme, themeCmd.font);
        setActiveFont(themeCmd.font);
        confirmText = `✓ font → ${themeCmd.font} · ${FONTS[themeCmd.font].label}`;
      } else if (themeCmd.type === "reset") {
        applyTheme("mint", "mono");
        setActiveTheme("mint");
        setActiveFont("mono");
        confirmText = "✓ reset to defaults · mint + mono";
      }
      setHistory((prev) => [
        ...prev,
        { input: trimmed, output: { type: "text", content: confirmText } },
      ]);
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

      // Handle action results (download, navigate)
      if (easterEgg.type === "action" && easterEgg.action) {
        const { action } = easterEgg;
        setTimeout(() => {
          if (action.kind === "download") {
            const a = document.createElement("a");
            a.href = action.url;
            a.download = action.url.split("/").pop() ?? "download";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          } else if (action.kind === "navigate") {
            router.push(action.url);
          }
        }, 300);
      }
      return;
    }

    // If it's a navigation command (anything else), trigger parse animation
    if (isNavigationCommand(trimmed)) {
      setIsActive(false);
      setHistory((prev) => [...prev, { input: trimmed, output: null }]);
      setInput("");
      setCursorPos(0);
      setTimeout(() => {
        onNavigate();
      }, 100);
    }
  }, [input, onNavigate, activeTheme, activeFont]);

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

  // Compute live hint for theme/font completion
  const liveCmd = parseThemeCmd(input);
  const inlineHint =
    liveCmd.type === "theme-pending"
      ? `→ ${Object.keys(THEMES).join(" · ")}`
      : liveCmd.type === "font-pending"
      ? `→ ${Object.keys(FONTS).join(" · ")}`
      : liveCmd.type === "theme-typing" && liveCmd.suggest
      ? `→ ${liveCmd.suggest.join(" · ")}`
      : liveCmd.type === "font-typing" && liveCmd.suggest
      ? `→ ${liveCmd.suggest.join(" · ")}`
      : liveCmd.valid && (liveCmd.type === "theme" || liveCmd.type === "font" || liveCmd.type === "reset")
      ? `· applied`
      : null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col items-start w-full overflow-y-auto",
        embedded ? "max-h-52" : "max-w-2xl mx-auto px-6 max-h-[80vh]"
      )}
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
              {entry.output.type === "action" && (
                <div className="text-ctp-subtext0 text-sm font-mono">
                  {(Array.isArray(entry.output.content)
                    ? entry.output.content
                    : [entry.output.content]
                  ).map((line, j) => (
                    <p key={j} className={cn(typeof line === "string" && line === "" ? "h-3" : "")}>
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
              <span className="text-ctp-text pointer-events-none select-none invisible">
                {input.slice(0, cursorPos)}
              </span>
              <span
                className={cn(
                  "inline-block w-[0.6em] h-[1.1em] bg-ctp-text align-middle",
                  "animate-cursor-blink"
                )}
                aria-hidden="true"
              />
            </div>

            {/* Live completion hint */}
            {inlineHint && (
              <span
                className="text-xs shrink-0"
                style={{ color: "var(--text-faint)", fontFamily: "var(--mono)" }}
              >
                {inlineHint}
              </span>
            )}
          </div>

          {/* Hint for non-devs — fades in after delay */}
          {showHint && history.length === 0 && (
            <div className="mt-6 animate-fade-in space-y-2">
              <p className="text-ctp-overlay2 text-xs font-mono">
                type anything and press <span className="text-ctp-subtext0">Enter</span> to begin
              </p>
              <p className="text-ctp-overlay1 text-xs font-mono">
                or try: <span className="text-ctp-subtext0">help</span>
                {" · "}
                <span className="text-ctp-subtext0">theme amber</span>
                {" · "}
                <span className="text-ctp-subtext0">ls</span>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
