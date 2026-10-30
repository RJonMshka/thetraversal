"use client";

import { createContext, useContext, type AnchorHTMLAttributes, type MouseEvent } from "react";
import type { Navigator } from "@tv/contract";

// ── AstNav (LLD-02 §4) ─────────────────────────────────────────────────
// The AST never touches the router. Links stay real <a href> for
// accessibility and middle-click, and plain clicks go through ctx.nav.

const AstNavContext = createContext<Navigator | null>(null);

export const AstNavProvider = AstNavContext.Provider;

export function useAstNav(): Navigator {
  const nav = useContext(AstNavContext);
  if (!nav) throw new Error("useAstNav must be used inside <AstNavProvider>");
  return nav;
}

function isPlainClick(e: MouseEvent<HTMLAnchorElement>): boolean {
  return !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

type NodeLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { id: string };

/** Link to an entity's page; a plain click navigates through ctx.nav.open. */
export function NodeLink({ id, onClick, ...rest }: NodeLinkProps) {
  const nav = useAstNav();
  return (
    <a
      href={`/node/${id}`}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (!isPlainClick(e)) return;
        e.preventDefault();
        nav.open(id);
      }}
    />
  );
}
