export const THEMES = {
  mint:   { bg: '#0b0d10', card: '#101418', text: '#e6e4dd', mute: 'rgba(230,228,221,0.6)',  faint: 'rgba(230,228,221,0.32)', line: 'rgba(255,255,255,0.07)',  line2: 'rgba(255,255,255,0.12)', accent: 'oklch(0.82 0.13 160)', accentDim: 'oklch(0.82 0.13 160 / 0.18)', accentFaint: 'oklch(0.82 0.13 160 / 0.08)', mode: 'dark'  as const, label: 'mint · default' },
  amber:  { bg: '#0e0a04', card: '#161009', text: '#f0e4cc', mute: 'rgba(240,228,204,0.62)', faint: 'rgba(240,228,204,0.32)', line: 'rgba(240,228,204,0.08)', line2: 'rgba(240,228,204,0.14)', accent: 'oklch(0.82 0.14 75)',  accentDim: 'oklch(0.82 0.14 75 / 0.18)',  accentFaint: 'oklch(0.82 0.14 75 / 0.10)',  mode: 'dark'  as const, label: 'amber · phosphor CRT' },
  ice:    { bg: '#080b12', card: '#0e131c', text: '#dde6f2', mute: 'rgba(221,230,242,0.6)',  faint: 'rgba(221,230,242,0.32)', line: 'rgba(221,230,242,0.07)', line2: 'rgba(221,230,242,0.13)', accent: 'oklch(0.82 0.13 235)', accentDim: 'oklch(0.82 0.13 235 / 0.18)', accentFaint: 'oklch(0.82 0.13 235 / 0.09)', mode: 'dark'  as const, label: 'ice · cold blue' },
  mono:   { bg: '#000000', card: '#0a0a0a', text: '#ffffff', mute: 'rgba(255,255,255,0.62)', faint: 'rgba(255,255,255,0.32)', line: 'rgba(255,255,255,0.10)', line2: 'rgba(255,255,255,0.18)', accent: '#ffffff',              accentDim: 'rgba(255,255,255,0.7)',        accentFaint: 'rgba(255,255,255,0.08)',        mode: 'dark'  as const, label: 'mono · pure b/w' },
  paper:  { bg: '#f3f0e6', card: '#faf8f1', text: '#2a251f', mute: 'rgba(42,37,31,0.62)',   faint: 'rgba(42,37,31,0.36)',   line: 'rgba(42,37,31,0.08)',   line2: 'rgba(42,37,31,0.14)',   accent: 'oklch(0.55 0.13 30)',  accentDim: 'oklch(0.55 0.13 30 / 0.25)',  accentFaint: 'oklch(0.55 0.13 30 / 0.10)',  mode: 'light' as const, label: 'paper · warm cream' },
  linen:  { bg: '#eee9dd', card: '#f6f2e7', text: '#2d3026', mute: 'rgba(45,48,38,0.6)',    faint: 'rgba(45,48,38,0.34)',   line: 'rgba(45,48,38,0.08)',   line2: 'rgba(45,48,38,0.14)',   accent: 'oklch(0.50 0.10 150)', accentDim: 'oklch(0.50 0.10 150 / 0.25)', accentFaint: 'oklch(0.50 0.10 150 / 0.10)', mode: 'light' as const, label: 'linen · sage on cream' },
  bone:   { bg: '#ededea', card: '#f5f5f2', text: '#1a1a1a', mute: 'rgba(26,26,26,0.6)',    faint: 'rgba(26,26,26,0.34)',   line: 'rgba(26,26,26,0.08)',   line2: 'rgba(26,26,26,0.14)',   accent: '#1a1a1a',              accentDim: 'rgba(26,26,26,0.45)',          accentFaint: 'rgba(26,26,26,0.06)',          mode: 'light' as const, label: 'bone · cool grey' },
  chalk:  { bg: '#f0f1f4', card: '#f8f9fb', text: '#1a2233', mute: 'rgba(26,34,51,0.6)',    faint: 'rgba(26,34,51,0.34)',   line: 'rgba(26,34,51,0.08)',   line2: 'rgba(26,34,51,0.14)',   accent: 'oklch(0.50 0.16 250)', accentDim: 'oklch(0.50 0.16 250 / 0.25)', accentFaint: 'oklch(0.50 0.16 250 / 0.08)', mode: 'light' as const, label: 'chalk · blueprint blue' },
  sun:    { bg: '#fbf3e0', card: '#fef9ec', text: '#3a2a10', mute: 'rgba(58,42,16,0.62)',   faint: 'rgba(58,42,16,0.36)',   line: 'rgba(58,42,16,0.08)',   line2: 'rgba(58,42,16,0.14)',   accent: 'oklch(0.62 0.16 60)',  accentDim: 'oklch(0.62 0.16 60 / 0.28)',  accentFaint: 'oklch(0.62 0.16 60 / 0.10)',  mode: 'light' as const, label: 'sun · warm amber' },
} as const;

export const FONTS = {
  mono:      { mono: '"JetBrains Mono", ui-monospace, monospace', serif: '"JetBrains Mono", ui-monospace, monospace', label: 'mono · uniform' },
  serif:     { mono: '"JetBrains Mono", ui-monospace, monospace', serif: '"Source Serif 4", "Source Serif Pro", Georgia, serif', label: 'serif · editorial mix' },
  brutalist: { mono: '"Courier New", ui-monospace, monospace', serif: '"Courier New", ui-monospace, monospace', label: 'brutalist · heavy mono' },
} as const;

export type ThemeName = keyof typeof THEMES;
export type FontName = keyof typeof FONTS;

const STORE_KEY = 'tv.theme.cmd';

export function loadPersistedTheme(): { theme: ThemeName; font: FontName } {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { theme: 'mint', font: 'mono' };
    const parsed = JSON.parse(raw);
    const theme = (parsed.theme in THEMES ? parsed.theme : 'mint') as ThemeName;
    const font = (parsed.font in FONTS ? parsed.font : 'mono') as FontName;
    return { theme, font };
  } catch { return { theme: 'mint', font: 'mono' }; }
}

export function saveTheme(theme: ThemeName, font: FontName) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ theme, font })); } catch {}
}

export function applyTheme(themeName: ThemeName, fontName: FontName) {
  const T = THEMES[themeName];
  const F = FONTS[fontName];
  const root = document.documentElement;

  root.style.setProperty('--ink', T.bg);
  root.style.setProperty('--ink-2', T.card);
  root.style.setProperty('--tv-text', T.text);
  root.style.setProperty('--text-mute', T.mute);
  root.style.setProperty('--text-faint', T.faint);
  root.style.setProperty('--line', T.line);
  root.style.setProperty('--line-2', T.line2);
  root.style.setProperty('--accent', T.accent);
  root.style.setProperty('--accent-dim', T.accentDim);
  root.style.setProperty('--accent-faint', T.accentFaint);
  root.style.setProperty('color-scheme', T.mode);

  root.style.setProperty('--font-mono', F.mono);
  root.style.setProperty('--font-serif', F.serif);
  root.style.setProperty('--mono', F.mono);
  root.style.setProperty('--serif', F.serif);

  saveTheme(themeName, fontName);
}

// ── Live command parser ───────────────────────────────────────────────────

export interface ParsedThemeCmd {
  type: 'idle' | 'theme' | 'font' | 'reset' | 'theme-pending' | 'font-pending' | 'theme-typing' | 'font-typing' | 'error';
  valid: boolean;
  theme?: ThemeName;
  font?: FontName;
  suggest?: string[];
  hint?: string;
  label?: string;
}

export function parseThemeCmd(input: string): ParsedThemeCmd {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return { type: 'idle', valid: false };

  if (trimmed === 'reset') return { type: 'reset', valid: true, theme: 'mint', font: 'mono', label: 'reset to defaults' };

  let m = trimmed.match(/^theme(?:\s+(\S*))?$/);
  if (m) {
    const name = m[1];
    if (!name) return { type: 'theme-pending', valid: false, hint: Object.keys(THEMES).join(' · ') };
    if (name in THEMES) {
      const t = name as ThemeName;
      return { type: 'theme', valid: true, theme: t, label: THEMES[t].label };
    }
    const matches = Object.keys(THEMES).filter(k => k.startsWith(name));
    if (matches.length) return { type: 'theme-typing', valid: false, suggest: matches };
    return { type: 'error', valid: false };
  }

  m = trimmed.match(/^font(?:\s+(\S*))?$/);
  if (m) {
    const name = m[1];
    if (!name) return { type: 'font-pending', valid: false, hint: Object.keys(FONTS).join(' · ') };
    if (name in FONTS) {
      const f = name as FontName;
      return { type: 'font', valid: true, font: f, label: FONTS[f].label };
    }
    const matches = Object.keys(FONTS).filter(k => k.startsWith(name));
    if (matches.length) return { type: 'font-typing', valid: false, suggest: matches };
    return { type: 'error', valid: false };
  }

  return { type: 'idle', valid: false };
}
