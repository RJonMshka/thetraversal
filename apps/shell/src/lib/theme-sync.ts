"use client";

import { useEffect, useState } from "react";
import { applyTheme, loadPersistedTheme, type FontName, type ThemeName } from "@tv/tokens";

// ── One theme writer for the landing page ──────────────────────────────
// The prompt (`theme amber`) and the swatches both change the theme; this
// keeps them in step so each shows what the other picked.

const EVENT = "tv:theme";

export interface ThemeState {
  theme: ThemeName;
  font: FontName;
}

export function setTheme(next: Partial<ThemeState>): void {
  const current = loadPersistedTheme();
  const state = { ...current, ...next };
  applyTheme(state.theme, state.font);
  window.dispatchEvent(new CustomEvent<ThemeState>(EVENT, { detail: state }));
}

export function useTheme(): ThemeState {
  const [state, setState] = useState<ThemeState>({ theme: "mint", font: "mono" });
  useEffect(() => {
    // Persisted theme is only readable after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadPersistedTheme());
    const onChange = (e: Event) => setState((e as CustomEvent<ThemeState>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return state;
}
