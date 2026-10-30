import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { THEMES, MINT_ACCENT_SRGB } from "@tv/tokens";

// Shared renderer for Open Graph cards. next/og (satori) has no access to
// CSS variables, so colors come from the default mint theme in themes.ts.
// Satori rule: every <div> with more than one child needs display: flex.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const T = THEMES.mint;
const FONT_DIR = join(process.cwd(), "src/lib/og/fonts");

async function loadFonts() {
  const [regular, bold] = await Promise.all([
    readFile(join(FONT_DIR, "JetBrainsMono-Regular.ttf")),
    readFile(join(FONT_DIR, "JetBrainsMono-Bold.ttf")),
  ]);
  return [
    { name: "JetBrains Mono", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "JetBrains Mono", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

interface OgCardProps {
  /** Small label above the title, e.g. the AST node type. */
  kicker: string;
  title: string;
  subtitle: string;
  /** Prompt shown at the bottom, after the `$`. */
  command: string;
}

export async function renderOgCard({ kicker, title, subtitle, command }: OgCardProps) {
  const titleSize = title.length > 28 ? 64 : 84;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: T.bg,
          color: T.text,
          fontFamily: "JetBrains Mono",
          border: `1px solid ${T.line2}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", color: T.faint, fontSize: 24, letterSpacing: 2 }}>
            THE TRAVERSAL
          </div>
          <div
            style={{
              display: "flex",
              width: 14,
              height: 14,
              borderRadius: 7,
              background: MINT_ACCENT_SRGB,
              opacity: 0.7,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: MINT_ACCENT_SRGB, fontSize: 26, marginBottom: 20 }}>
            {kicker}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
              marginBottom: 28,
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", color: T.mute, fontSize: 28, lineHeight: 1.4, maxWidth: 980 }}>
            {subtitle}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", fontSize: 28, color: T.mute }}>
          <span style={{ color: MINT_ACCENT_SRGB, marginRight: 16 }}>$</span>
          <span>{command}</span>
          <span
            style={{
              display: "flex",
              width: 16,
              height: 32,
              marginLeft: 8,
              background: MINT_ACCENT_SRGB,
            }}
          />
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await loadFonts() },
  );
}
