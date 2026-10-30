import type { ThemeSnapshot } from "@tv/contract";
import { FONTS, SYNTAX, THEMES, loadPersistedTheme, type FontName, type ThemeName } from "./themes";

/**
 * Resolved theme values for targets that cannot read CSS vars per frame
 * (canvas, WebGL). Defaults to the persisted theme; call in the browser.
 */
export function themeSnapshot(theme?: ThemeName, font?: FontName): ThemeSnapshot {
  const persisted = theme && font ? { theme, font } : loadPersistedTheme();
  const name = theme ?? persisted.theme;
  const fontName = font ?? persisted.font;
  const t = THEMES[name];
  return {
    name,
    font: FONTS[fontName].mono,
    colors: { bg: t.bg, card: t.card, text: t.text, mute: t.mute, accent: t.accent, line: t.line },
    syntax: { ...SYNTAX[t.mode] },
  };
}
