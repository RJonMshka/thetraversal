// ── DOM helpers ────────────────────────────────────────────────────────
// Text always goes in through textContent: IR strings are never parsed
// as HTML.

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  ...children: (Node | string | null | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  for (const c of children) if (c !== null && c !== false) el.append(c);
  return el;
}

/** A syntax-colored span for the devtools panel. */
export const tok = (kind: "tag" | "attr" | "str" | "txt" | "prop" | "val" | "sel" | "punc" | "com", text: string) =>
  h("span", `t-${kind}`, text);

/**
 * el's border box in `to`'s padding box (where an absolutely placed child
 * of `to` lands), from layout offsets: in-flight transforms are ignored, so
 * an overlay shows where things are going, not where they are mid-flight.
 * `to` must be positioned.
 */
export function offsetIn(el: HTMLElement, to: HTMLElement): { x: number; y: number; w: number; h: number } {
  let x = 0;
  let y = 0;
  let cur: HTMLElement | null = el;
  while (cur && cur !== to) {
    x += cur.offsetLeft;
    y += cur.offsetTop;
    const parent = cur.offsetParent as HTMLElement | null;
    if (parent && parent !== to) {
      x += parent.clientLeft;
      y += parent.clientTop;
    }
    cur = parent;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/** Positions an absolutely placed overlay element. */
export function place(el: HTMLElement, b: { x: number; y: number; w: number; h: number }): void {
  el.style.transform = `translate(${Math.round(b.x * 10) / 10}px, ${Math.round(b.y * 10) / 10}px)`;
  el.style.width = `${Math.max(0, b.w)}px`;
  el.style.height = `${Math.max(0, b.h)}px`;
}

export const px = (s: string) => parseFloat(s) || 0;

/**
 * A layout shown through transforms. The real CSS goes on `list`, which is
 * laid out but invisible: it is what the overlay measures and what the
 * panel describes. The visible items sit in a second list on top and are
 * moved to where the browser placed each real item with transform, width
 * and height only, so layout changes animate as CSS transitions and never
 * count as layout shift (CLS) for the page.
 */
export interface Mirror {
  live: HTMLUListElement;
  /** Copy the real layout onto the visible items; `animate` false jumps. */
  sync(animate: boolean): void;
}

export function mirror(list: HTMLElement, ghosts: readonly HTMLElement[], lives: readonly HTMLElement[]): Mirror {
  list.classList.add("ghost-layout");
  list.setAttribute("aria-hidden", "true");
  const live = h("ul", "live", ...lives);
  return {
    live,
    sync(animate) {
      live.classList.toggle("instant", !animate);
      ghosts.forEach((g, i) => {
        const el = lives[i];
        if (!el) return;
        // offsetLeft/Top are in `list`'s padding box; `live` has the same border, so its padding box matches.
        el.style.transform = `translate(${g.offsetLeft}px, ${g.offsetTop}px)`;
        el.style.width = `${g.offsetWidth}px`;
        el.style.height = `${g.offsetHeight}px`;
      });
    },
  };
}
