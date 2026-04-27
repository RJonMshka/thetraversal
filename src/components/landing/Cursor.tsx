"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  embedded?: boolean;
}

// ── Output renderer ────────────────────────────────────────────────────────
function HistoryOutput({ output }: { output: EasterEggResult }) {
  const base: React.CSSProperties = {
    marginTop: 4,
    marginLeft: 20,
    fontFamily: "var(--mono)",
    fontSize: 12,
    lineHeight: 1.85,
    color: "var(--text-mute)",
  };

  if (output.type === "json") {
    return (
      <pre style={{ ...base, color: "oklch(0.78 0.13 70)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {output.content as string}
      </pre>
    );
  }
  if (output.type === "text") {
    return (
      <p style={{ ...base, color: "var(--accent)" }}>{output.content as string}</p>
    );
  }
  // lines / action
  return (
    <div style={base}>
      {(Array.isArray(output.content) ? output.content : [output.content]).map((line, i) => (
        <p key={i} style={{ minHeight: typeof line === "string" && line === "" ? "0.8em" : undefined }}>
          {line}
        </p>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function Cursor({ onNavigate, embedded = false }: CursorProps) {
  const router = useRouter();

  // Core state
  const [input, setInput] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeName>("mint");
  const [activeFont, setActiveFont] = useState<FontName>("mono");

  // Autocomplete state
  const [acOpen, setAcOpen] = useState(false);
  const [acSuggestions, setAcSuggestions] = useState<string[]>([]);
  const [acIndex, setAcIndex] = useState(0);
  const [acIsTheme, setAcIsTheme] = useState(true);

  // Inline echo state
  const [isEchoing, setIsEchoing] = useState(false);
  const [pendingInput, setPendingInput] = useState("");
  const [echoText, setEchoText] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const echoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const echoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted theme
  useEffect(() => {
    const { theme, font } = loadPersistedTheme();
    setActiveTheme(theme);
    setActiveFont(font);
  }, []);

  // Show non-dev hint after 3 s
  useEffect(() => {
    const t = setTimeout(() => setShowHint(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Live-apply theme as user types a valid command
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

  // Update autocomplete suggestions when input changes
  useEffect(() => {
    const cmd = parseThemeCmd(input);
    if (cmd.type === "theme-pending") {
      setAcSuggestions(Object.keys(THEMES));
      setAcIsTheme(true);
      setAcOpen(true);
      setAcIndex(0);
    } else if (cmd.type === "theme-typing" && cmd.suggest?.length) {
      setAcSuggestions(cmd.suggest);
      setAcIsTheme(true);
      setAcOpen(true);
      setAcIndex(0);
    } else if (cmd.type === "font-pending") {
      setAcSuggestions(Object.keys(FONTS));
      setAcIsTheme(false);
      setAcOpen(true);
      setAcIndex(0);
    } else if (cmd.type === "font-typing" && cmd.suggest?.length) {
      setAcSuggestions(cmd.suggest);
      setAcIsTheme(false);
      setAcOpen(true);
      setAcIndex(0);
    } else {
      setAcOpen(false);
    }
  }, [input]);

  // Scroll to bottom on new output
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history, echoText, isEchoing]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Cleanup echo timers
  useEffect(() => () => {
    if (echoIntervalRef.current) clearInterval(echoIntervalRef.current);
    if (echoTimeoutRef.current) clearTimeout(echoTimeoutRef.current);
  }, []);

  const startEcho = useCallback((text: string, onDone: () => void) => {
    setEchoText("");
    setIsEchoing(true);
    let i = 0;
    echoIntervalRef.current = setInterval(() => {
      i++;
      setEchoText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(echoIntervalRef.current!);
        echoIntervalRef.current = null;
        echoTimeoutRef.current = setTimeout(onDone, 450);
      }
    }, 18);
  }, []);

  const executeCommand = useCallback((trimmed: string) => {
    // clear
    if (trimmed === "clear") {
      setHistory([]);
      setInput("");
      setCursorPos(0);
      setPendingInput("");
      setIsEchoing(false);
      return;
    }

    // theme / font / reset — inline echo animation
    const themeCmd = parseThemeCmd(trimmed);
    if (themeCmd.type === "theme" && themeCmd.theme) {
      const confirmText = `✓ theme set: ${themeCmd.theme} · ${THEMES[themeCmd.theme].label}`;
      startEcho(confirmText, () => {
        setHistory(prev => [...prev, { input: trimmed, output: { type: "text", content: confirmText } }]);
        setIsEchoing(false);
        setPendingInput("");
        setEchoText("");
        setInput("");
        setCursorPos(0);
      });
      return;
    }
    if (themeCmd.type === "font" && themeCmd.font) {
      const confirmText = `✓ font set: ${themeCmd.font} · ${FONTS[themeCmd.font].label}`;
      startEcho(confirmText, () => {
        setHistory(prev => [...prev, { input: trimmed, output: { type: "text", content: confirmText } }]);
        setIsEchoing(false);
        setPendingInput("");
        setEchoText("");
        setInput("");
        setCursorPos(0);
      });
      return;
    }
    if (themeCmd.type === "reset") {
      const confirmText = "✓ reset to defaults · mint + mono";
      startEcho(confirmText, () => {
        setHistory(prev => [...prev, { input: trimmed, output: { type: "text", content: confirmText } }]);
        setIsEchoing(false);
        setPendingInput("");
        setEchoText("");
        setInput("");
        setCursorPos(0);
      });
      return;
    }

    // easter eggs — immediate output, no typing animation
    const easterEgg = getEasterEgg(trimmed);
    if (easterEgg) {
      setHistory(prev => [...prev, { input: trimmed, output: easterEgg }]);
      setInput("");
      setCursorPos(0);
      setPendingInput("");
      setIsEchoing(false);
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

    // navigation
    if (isNavigationCommand(trimmed)) {
      setIsActive(false);
      setHistory(prev => [...prev, { input: trimmed, output: null }]);
      setInput("");
      setCursorPos(0);
      setPendingInput("");
      setIsEchoing(false);
      setTimeout(() => onNavigate(), 100);
    }
  }, [startEcho, router, onNavigate]);

  const applyACSuggestion = useCallback((name: string) => {
    const cmd = parseThemeCmd(input);
    const newInput = (cmd.type === "theme-pending" || cmd.type === "theme-typing")
      ? `theme ${name}` : `font ${name}`;
    setInput(newInput);
    setCursorPos(newInput.length);
    setAcOpen(false);
    // Immediately apply so the live-theme effect doesn't lag
    const applied = parseThemeCmd(newInput);
    if (applied.valid) {
      if (applied.type === "theme" && applied.theme) {
        applyTheme(applied.theme, activeFont);
        setActiveTheme(applied.theme);
      } else if (applied.type === "font" && applied.font) {
        applyTheme(activeTheme, applied.font);
        setActiveFont(applied.font);
      }
    }
    inputRef.current?.focus();
  }, [input, activeFont, activeTheme]);

  const handleSubmit = useCallback(() => {
    if (isEchoing) return;
    const trimmed = input.trim();
    if (!trimmed) return;

    // If autocomplete open → apply selected suggestion
    if (acOpen && acSuggestions.length > 0) {
      applyACSuggestion(acSuggestions[acIndex]);
      return;
    }

    setAcOpen(false);
    setPendingInput(trimmed);
    executeCommand(trimmed);
  }, [isEchoing, input, acOpen, acSuggestions, acIndex, applyACSuggestion, executeCommand]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (!isActive) return;
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Escape") {
        setAcOpen(false);
      } else if (acOpen) {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setAcIndex(i => (i - 1 + acSuggestions.length) % acSuggestions.length);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setAcIndex(i => (i + 1) % acSuggestions.length);
        } else if (e.key === "Tab") {
          e.preventDefault();
          applyACSuggestion(acSuggestions[acIndex]);
        }
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [isActive, handleSubmit, acOpen, acSuggestions, acIndex, applyACSuggestion]);

  // ── Prompt styling ──────────────────────────────────────────────────────
  const liveCmd = parseThemeCmd(input);
  const isValid = liveCmd.valid;
  const isError = liveCmd.type === "error";
  const ringColor = isValid ? "var(--accent)" : isError ? "#ff8a80" : undefined;
  const hintColor = isValid ? "var(--accent)" : isError ? "#ff8a80" : "var(--text-faint)";
  const hintText = isEchoing ? "" :
    (liveCmd.type === "theme-pending" || liveCmd.type === "font-pending")
      ? `${acSuggestions.length} options · ↑↓ ↵`
    : (liveCmd.type === "theme-typing" || liveCmd.type === "font-typing") && liveCmd.suggest?.length
      ? `${liveCmd.suggest.length} match · ↑↓ ↵`
    : isValid
      ? "↵ confirm · already applied"
    : isError
      ? "no match"
    : "type to apply";

  const dropdownOpen = acOpen && acSuggestions.length > 0 && !isEchoing;

  return (
    <div
      ref={containerRef}
      onClick={() => inputRef.current?.focus()}
      role="log"
      aria-label="Terminal"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        width: "100%",
        overflowY: "auto",
        maxHeight: embedded ? 272 : "80vh",
        fontFamily: "var(--mono)",
      }}
    >
      {/* ── History ──────────────────────────────────────────────────── */}
      {history.map((entry, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <span style={{ color: "var(--accent)", flexShrink: 0 }}>›</span>
            <span style={{ color: "var(--text-mute)" }}>{entry.input}</span>
          </div>
          {entry.output && <HistoryOutput output={entry.output} />}
        </div>
      ))}

      {/* ── Echo (inline typing animation after Enter) ────────────────── */}
      {isEchoing && (
        <div style={{ marginBottom: 8 }}>
          {/* Submitted command — dimmed */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, opacity: 0.5 }}>
            <span style={{ color: "var(--accent)", flexShrink: 0 }}>›</span>
            <span style={{ color: "var(--tv-text)" }}>{pendingInput}</span>
          </div>
          {/* Response typing */}
          <div style={{ marginLeft: 20, marginTop: 3, fontSize: 13, display: "flex", alignItems: "center" }}>
            <span style={{ color: "var(--accent)" }}>{echoText}</span>
            <span className="cli-cursor-bar" aria-hidden="true" />
          </div>
        </div>
      )}

      {/* ── Active prompt ─────────────────────────────────────────────── */}
      {isActive && !isEchoing && (
        <div style={{ width: "100%", position: "relative" }}>
          {/* Prompt row — grid prevents hint from causing reflow */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr 200px",
              alignItems: "center",
              gap: 12,
              padding: "11px 14px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--line-2)",
              borderRadius: dropdownOpen ? "4px 4px 0 0" : 4,
              fontSize: 13,
              cursor: "text",
              boxShadow: ringColor ? `inset 0 0 0 1px ${ringColor}` : undefined,
              transition: "box-shadow 0.12s ease, border-radius 0.1s ease",
            }}
          >
            {/* Prompt glyph */}
            <span style={{ color: "var(--accent)", lineHeight: 1, userSelect: "none" }}>›</span>

            {/* Text input area */}
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              {/* Hidden real input — captures all keystrokes */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  setCursorPos(e.target.selectionStart ?? e.target.value.length);
                }}
                onKeyUp={e => setCursorPos(e.currentTarget.selectionStart ?? cursorPos)}
                onSelect={e => setCursorPos(e.currentTarget.selectionStart ?? cursorPos)}
                style={{
                  position: "absolute", inset: 0, width: "100%",
                  background: "transparent", outline: "none", border: "none",
                  fontFamily: "var(--mono)", fontSize: 13, color: "transparent",
                  caretColor: "transparent",
                }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label="Terminal input"
                aria-autocomplete={dropdownOpen ? "list" : "none"}
                aria-expanded={dropdownOpen}
              />
              {/* Visible text — split at cursor position */}
              <span style={{ color: "var(--tv-text)", whiteSpace: "pre", pointerEvents: "none" }}>
                {input.slice(0, cursorPos)}
              </span>
              <span className="cli-cursor-bar" aria-hidden="true" />
              <span style={{ color: "var(--tv-text)", whiteSpace: "pre", pointerEvents: "none" }}>
                {input.slice(cursorPos)}
              </span>
            </div>

            {/* Hint — reserved 200px column, never shifts layout */}
            <span
              style={{
                fontSize: 10, color: hintColor,
                textAlign: "right", whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1,
                userSelect: "none",
              }}
            >
              {hintText}
            </span>
          </div>

          {/* Autocomplete dropdown — flush against prompt, visually one widget */}
          {dropdownOpen && (
            <div
              role="listbox"
              style={{
                background: "var(--ink-2)",
                border: "1px solid var(--line-2)",
                borderTop: "none",
                borderRadius: "0 0 4px 4px",
                overflow: "hidden",
              }}
            >
              {acSuggestions.map((name, idx) => {
                const isSelected = idx === acIndex;
                const swatch = acIsTheme && name in THEMES
                  ? { bg: THEMES[name as ThemeName].bg, accent: THEMES[name as ThemeName].accent }
                  : null;
                const fullLabel = acIsTheme
                  ? THEMES[name as ThemeName]?.label ?? name
                  : FONTS[name as FontName]?.label ?? name;
                const shortDesc = fullLabel.split(" · ")[1] ?? fullLabel;

                return (
                  <div
                    key={name}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => applyACSuggestion(name)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: swatch ? "28px 90px 1fr auto" : "90px 1fr auto",
                      alignItems: "center",
                      gap: 12,
                      padding: "9px 14px",
                      background: isSelected ? "var(--accent-faint)" : "transparent",
                      borderLeft: `2px solid ${isSelected ? "var(--accent)" : "transparent"}`,
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "var(--mono)",
                    }}
                  >
                    {swatch && (
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <span style={{
                          width: 11, height: 11, borderRadius: 2,
                          background: swatch.bg,
                          border: "1px solid rgba(255,255,255,0.15)",
                          flexShrink: 0,
                        }} />
                        <span style={{
                          width: 11, height: 11, borderRadius: 2,
                          background: swatch.accent,
                          flexShrink: 0,
                        }} />
                      </div>
                    )}
                    <span style={{ color: isSelected ? "var(--accent)" : "var(--tv-text)" }}>
                      {name}
                    </span>
                    <span style={{ color: "var(--text-faint)", fontSize: 11 }}>
                      · {shortDesc}
                    </span>
                    {isSelected && (
                      <span style={{ fontSize: 10, color: "var(--accent)" }}>↵</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Non-dev hint (fades in after 3 s, dismisses on first input) ─ */}
      {showHint && history.length === 0 && !isEchoing && isActive && (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>
            type anything and press{" "}
            <span style={{ color: "var(--text-mute)" }}>Enter</span> to begin
          </p>
          <p style={{ fontSize: 11, color: "var(--text-faint)" }}>
            or try:{" "}
            <span style={{ color: "var(--text-mute)" }}>help</span>
            {" · "}
            <span style={{ color: "var(--text-mute)" }}>theme amber</span>
            {" · "}
            <span style={{ color: "var(--text-mute)" }}>ls</span>
          </p>
        </div>
      )}
    </div>
  );
}
