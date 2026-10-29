import { cn } from "@/lib/utils";

interface NodeBodyProps {
  /** Compiled, sanitized HTML from the IR body store. Preferred. */
  html?: string;
  /** Plain excerpt, paragraphs separated by a blank line. */
  text?: string;
  /** Container classes: indentation and paragraph spacing. */
  className?: string;
}

/** True when there is something for NodeBody to render. */
export function hasNodeBody({ html, text }: Pick<NodeBodyProps, "html" | "text">): boolean {
  return Boolean(html) || Boolean(text?.split("\n\n").some(Boolean));
}

// ── Node prose ─────────────────────────────────────────────────────────
// A node's body on /node pages: the IR body when the node has one,
// otherwise its excerpt. Both render as the same paragraphs.
export function NodeBody({ html, text, className }: NodeBodyProps) {
  if (html) {
    // Sanitized at build time by the IR compiler (rehype-sanitize).
    return (
      <div
        className={cn("tv-prose-compact", className)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const paragraphs = text?.split("\n\n").filter(Boolean) ?? [];
  return (
    <div className={className}>
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="text-ctp-text text-sm leading-7">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
