import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "The Traversal — Rajat Kumar";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#1e1e2e",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        {/* Subtle glow backdrop */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(203,166,247,0.08) 0%, transparent 70%)",
          }}
        />

        {/* AST tree mini visualization */}
        <svg
          width="200"
          height="120"
          viewBox="0 0 200 120"
          style={{ marginBottom: "32px", opacity: 0.6 }}
        >
          <circle cx="100" cy="12" r="8" fill="#cba6f7" />
          <line x1="100" y1="20" x2="50" y2="50" stroke="#45475a" strokeWidth="2" />
          <line x1="100" y1="20" x2="100" y2="50" stroke="#45475a" strokeWidth="2" />
          <line x1="100" y1="20" x2="150" y2="50" stroke="#45475a" strokeWidth="2" />
          <circle cx="50" cy="55" r="6" fill="#fab387" />
          <circle cx="100" cy="55" r="6" fill="#94e2d5" />
          <circle cx="150" cy="55" r="6" fill="#b4befe" />
          <line x1="50" y1="61" x2="30" y2="85" stroke="#45475a" strokeWidth="1.5" />
          <line x1="50" y1="61" x2="70" y2="85" stroke="#45475a" strokeWidth="1.5" />
          <circle cx="30" cy="90" r="4" fill="#a6e3a1" />
          <circle cx="70" cy="90" r="4" fill="#f9e2af" />
          <line x1="150" y1="61" x2="135" y2="85" stroke="#45475a" strokeWidth="1.5" />
          <line x1="150" y1="61" x2="165" y2="85" stroke="#45475a" strokeWidth="1.5" />
          <circle cx="135" cy="90" r="4" fill="#f38ba8" />
          <circle cx="165" cy="90" r="4" fill="#89b4fa" />
        </svg>

        {/* Title */}
        <div
          style={{
            color: "#cdd6f4",
            fontSize: "48px",
            fontWeight: "bold",
            letterSpacing: "-1px",
            marginBottom: "12px",
          }}
        >
          The Traversal
        </div>

        {/* Subtitle */}
        <div
          style={{
            color: "#a6adc8",
            fontSize: "20px",
            marginBottom: "24px",
          }}
        >
          An AST-based developer portfolio
        </div>

        {/* Author */}
        <div
          style={{
            color: "#6c7086",
            fontSize: "16px",
          }}
        >
          <span style={{ color: "#a6e3a1" }}>$</span> traverse(rajat_kumar)
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
