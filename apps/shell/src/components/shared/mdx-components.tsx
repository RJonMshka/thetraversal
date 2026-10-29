import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

// ── MDX custom components ──────────────────────────────────────────────
// These override the default HTML elements rendered by MDX, giving
// philosophy essays the Catppuccin-themed, serif-mono aesthetic.

export function MdxH2(props: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      {...props}
      className={cn(
        "font-mono text-lg text-ctp-lavender mt-12 mb-4",
        "border-b border-ctp-surface0 pb-2"
      )}
    />
  );
}

export function MdxH3(props: ComponentPropsWithoutRef<"h3">) {
  return (
    <h3
      {...props}
      className="font-mono text-base text-ctp-mauve mt-8 mb-3"
    />
  );
}

export function MdxParagraph(props: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      {...props}
      className="font-serif text-base leading-[1.8] text-ctp-text mb-6"
    />
  );
}

export function MdxBlockquote(props: ComponentPropsWithoutRef<"blockquote">) {
  return (
    <blockquote
      {...props}
      className={cn(
        "border-l-2 border-ctp-lavender pl-6 my-8",
        "font-serif italic text-ctp-subtext0 leading-[1.8]",
        "[&>p]:mb-2 [&>p]:text-ctp-subtext0"
      )}
    />
  );
}

export function MdxEmphasis(props: ComponentPropsWithoutRef<"em">) {
  return <em {...props} className="text-ctp-subtext1 not-italic font-serif" />;
}

export function MdxStrong(props: ComponentPropsWithoutRef<"strong">) {
  return (
    <strong {...props} className="text-ctp-peach font-serif font-semibold" />
  );
}

export function MdxInlineCode(props: ComponentPropsWithoutRef<"code">) {
  // Only style inline code — fenced code blocks are handled by rehype-pretty-code
  const isInline = !props.className?.includes("language-");
  if (!isInline) {
    return <code {...props} />;
  }

  return (
    <code
      {...props}
      className={cn(
        "font-mono text-[0.9em] text-ctp-peach",
        "bg-ctp-surface0 rounded px-1.5 py-0.5"
      )}
    />
  );
}

export function MdxPre(props: ComponentPropsWithoutRef<"pre">) {
  return (
    <pre
      {...props}
      className={cn(
        "my-8 rounded-lg overflow-x-auto",
        "bg-ctp-mantle border border-ctp-surface0",
        "p-4 text-sm leading-relaxed",
        "[&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit",
        // rehype-pretty-code applies data attributes
        "[&[data-theme]]:bg-ctp-mantle"
      )}
    />
  );
}

export function MdxLink(props: ComponentPropsWithoutRef<"a">) {
  const isExternal = props.href?.startsWith("http");
  return (
    <a
      {...props}
      className={cn(
        "text-ctp-lavender underline underline-offset-4 decoration-ctp-surface1",
        "hover:decoration-ctp-lavender transition-colors duration-150"
      )}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    />
  );
}

export function MdxHr() {
  return (
    <hr className="my-10 border-none h-px bg-ctp-surface0" />
  );
}

export function MdxUl(props: ComponentPropsWithoutRef<"ul">) {
  return (
    <ul
      {...props}
      className="list-disc list-outside pl-6 space-y-2 mb-6 font-serif text-base leading-[1.8] text-ctp-text marker:text-ctp-overlay0"
    />
  );
}

export function MdxOl(props: ComponentPropsWithoutRef<"ol">) {
  return (
    <ol
      {...props}
      className="list-decimal list-outside pl-6 space-y-2 mb-6 font-serif text-base leading-[1.8] text-ctp-text marker:text-ctp-overlay0"
    />
  );
}

export function MdxLi(props: ComponentPropsWithoutRef<"li">) {
  return <li {...props} className="pl-1" />;
}

// ── Footnote component (for margin notes in essays) ────────────────────

interface FootnoteProps {
  children: React.ReactNode;
}

export function Footnote({ children }: FootnoteProps) {
  return (
    <span className="relative group">
      <span className="text-ctp-lavender cursor-help text-[0.8em] align-super font-mono">
        *
      </span>
      <span
        className={cn(
          "absolute left-0 bottom-full mb-2 hidden group-hover:block",
          "bg-ctp-surface0 border border-ctp-surface1 rounded-lg p-3",
          "text-xs font-mono text-ctp-subtext0 leading-relaxed",
          "w-64 z-50 shadow-lg"
        )}
      >
        {children}
      </span>
    </span>
  );
}

// ── Components map for MDXRemote ───────────────────────────────────────

export const mdxComponents = {
  h2: MdxH2,
  h3: MdxH3,
  p: MdxParagraph,
  blockquote: MdxBlockquote,
  em: MdxEmphasis,
  strong: MdxStrong,
  code: MdxInlineCode,
  pre: MdxPre,
  a: MdxLink,
  hr: MdxHr,
  ul: MdxUl,
  ol: MdxOl,
  li: MdxLi,
  Footnote,
};
