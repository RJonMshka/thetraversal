"use client";

import { useEffect } from "react";
import { loadPersistedTheme, applyTheme } from "@/lib/themes";

export function ThemeInitializer() {
  useEffect(() => {
    const { theme, font } = loadPersistedTheme();
    if (theme !== "mint" || font !== "mono") {
      applyTheme(theme, font);
    }
  }, []);
  return null;
}
