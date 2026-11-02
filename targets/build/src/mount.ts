import type { ChromeInset, TargetModule } from "@tv/contract";
import { boxChapter, docChapter, endChapter, flexChapter, gridChapter, type Actions, type Chapter } from "@/chapters";
import { h } from "@/dom";
import { createMeter } from "@/meter";
import { buildModel } from "@/model";
import { adoptStyles } from "@/styles";
import { clamp01 } from "@/timeline";

// ── build target entry (LLD-02 §3) ─────────────────────────────────────
// The portfolio as a page being written. Scrolling types elements into
// <body>, scrubs the box model in, then lays the frontend skills out one
// flex declaration at a time, with a devtools-style overlay and panel
// drawn from real layout measurements. Plain DOM and CSS, no framework.

const target: TargetModule = {
  mount(root, ctx) {
    ctx.telemetry.mark("mount");
    const mountedAt = performance.now();
    const meter = createMeter(`/_t/${ctx.id}/`);
    adoptStyles(root);
    const model = buildModel(ctx.ir);
    const still = ctx.env.reducedMotion;

    let focus: string | null = null;
    const act: Actions = {
      focus: (id) => {
        if (id === focus) return;
        show(id);
        ctx.nav.focus(id);
      },
      open: (id) => ctx.nav.open(id),
      switchTarget: (id) => ctx.nav.switchTarget(id, focus ? { focus } : undefined),
    };

    const narrow = Math.min(ctx.env.viewport.width, ctx.env.viewport.height) < 560;
    const chapters: Chapter[] = [
      docChapter(model, act, meter, ctx.env.pointer === "coarse"),
      boxChapter(model, meter, narrow),
      flexChapter(model, act, meter, narrow ? 8 : 14),
      gridChapter(model, act, meter, narrow),
      endChapter(model, act, meter, root),
    ];

    const stage = h("div", still ? "stage still" : "stage");
    const scroller = h("div", "scroller");
    scroller.tabIndex = 0;
    scroller.setAttribute("aria-label", "the page, being built as you scroll");
    for (const c of chapters) {
      c.section.style.setProperty("--len", String(c.length));
      scroller.append(c.section);
    }

    const rail = h("nav", "rail");
    rail.setAttribute("aria-label", "chapters");
    const railButtons = chapters.map((c, i) => {
      const b = h("button", "", h("span", "n", String(i + 1).padStart(2, "0")), " ", c.label);
      b.type = "button";
      b.addEventListener("click", () => goTo(i, 0));
      return b;
    });
    const bar = h("span");
    rail.append(...railButtons, h("span", "progress", bar));
    const caption = h("p", "caption");
    caption.setAttribute("aria-hidden", "true");
    caption.append(h("span", "kw", "build"), " · scroll or ↓ to write the page", h("span", "more", ` · ↑ undo · 1–${chapters.length} chapters · ↵ open`));
    stage.append(scroller, h("div", "head", rail), caption);
    root.append(stage);

    let inset: ChromeInset = ctx.inset;
    let vh = 0;
    const reached = new Set<string>();

    const setVars = () => {
      for (const side of ["top", "right", "bottom", "left"] as const) stage.style.setProperty(`--inset-${side}`, `${inset[side]}px`);
      vh = scroller.clientHeight;
      stage.style.setProperty("--vh", `${vh}px`);
    };

    /** Progress of the scroll through chapter i: 0 when its frame sticks, 1 when it lets go. */
    const progress = (i: number) => {
      if (still) return 1;
      const s = chapters[i]!.section;
      const run = s.offsetHeight - vh;
      return run <= 0 ? 1 : clamp01((scroller.scrollTop - s.offsetTop) / run);
    };
    const current = () => {
      const y = scroller.scrollTop + vh * 0.5;
      let at = 0;
      chapters.forEach((c, i) => {
        if (c.section.offsetTop <= y) at = i;
      });
      return at;
    };

    const update = (animate: boolean) => {
      const top = scroller.scrollTop;
      chapters.forEach((c, i) => {
        const s = c.section;
        const visible = still || (s.offsetTop < top + vh && s.offsetTop + s.offsetHeight > top);
        if (visible) c.apply(progress(i), animate && !still);
      });
      const run = scroller.scrollHeight - vh;
      bar.style.transform = `scaleX(${run > 0 ? clamp01(top / run) : 1})`;
      stage.classList.toggle("scrolled", top > 24);
      const at = current();
      railButtons.forEach((b, i) => b.classList.toggle("on", i === at));
      const key = chapters[at]!.key;
      if (!reached.has(key)) {
        reached.add(key);
        ctx.telemetry.event("chapter", { chapter: key });
      }
    };

    let queued = 0;
    const onScroll = () => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        update(true);
      });
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });

    // ── Moving by beats: every stop is just past a step of a chapter ──
    const stopTops = () =>
      chapters.flatMap((c) => c.stops.map((t) => Math.round(c.section.offsetTop + t * Math.max(0, c.section.offsetHeight - vh))));
    const scrollTo = (y: number) => scroller.scrollTo({ top: y, behavior: still ? "auto" : "smooth" });
    function goTo(i: number, t: number) {
      const c = chapters[i];
      if (!c) return;
      scrollTo(c.section.offsetTop + t * Math.max(0, c.section.offsetHeight - vh));
    }
    const step = (dir: 1 | -1) => {
      const y = scroller.scrollTop;
      const tops = [...new Set(stopTops())].sort((a, b) => a - b);
      const next = dir > 0 ? tops.find((t) => t > y + 2) : tops.reverse().find((t) => t < y - 2);
      if (next !== undefined) scrollTo(next);
    };

    function show(id: string | null) {
      focus = id && model.has(id) && id !== model.root ? id : null;
      for (const c of chapters) c.setFocus(focus);
    }

    // Keys work without focusing anything first: same gate as the other
    // targets (inside this root, on its host, or nothing focused).
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const origin = e.composedPath()[0];
      const inside = origin instanceof Node && (origin === root.host || root.contains(origin));
      const idle = origin === document.body || origin === document.documentElement || origin === document || origin === window;
      if (!inside && !idle) return;
      const onButton = origin instanceof HTMLButtonElement || origin instanceof HTMLAnchorElement;
      const k = e.key;
      if (k === "ArrowDown" || k === "PageDown" || k === "j" || (k === " " && !onButton && !e.shiftKey)) step(1);
      else if (k === "ArrowUp" || k === "PageUp" || k === "k" || (k === " " && !onButton && e.shiftKey)) step(-1);
      else if (k === "Home") scrollTo(0);
      else if (k === "End") scrollTo(scroller.scrollHeight);
      else if (/^[1-9]$/.test(k) && Number(k) <= chapters.length) goTo(Number(k) - 1, 0);
      else if (k === "Enter" && focus && !onButton) ctx.nav.open(focus);
      else if ((k === "Escape" || k === "Backspace") && focus) {
        const up = model.parent(focus);
        if (up) act.focus(up);
        else return;
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);

    // ── Size, first frame, shell events ──────────────────────────────
    const relayout = () => {
      setVars();
      update(false);
      for (const c of chapters) c.measure();
    };
    const resizer = new ResizeObserver(relayout);
    resizer.observe(scroller);
    // Overlays measure text; re-measure once webfonts settle.
    void document.fonts?.ready.then(() => !ctx.signal.aborted && relayout());

    show(ctx.focus);
    setVars();
    update(false);
    requestAnimationFrame(() => {
      meter.firstFrame = performance.now() - mountedAt;
      ctx.telemetry.mark("first_frame");
      ctx.ready();
    });

    const offs = [
      ctx.bus.on("chrome:inset", (e) => {
        inset = e.inset;
        relayout();
      }),
    ];

    return {
      setFocus(id) {
        // The shell echoes our own requests back: treat them idempotently.
        if ((id ?? null) === focus) return;
        show(id);
      },
      unmount() {
        for (const off of offs) off();
        window.removeEventListener("keydown", onKey);
        scroller.removeEventListener("scroll", onScroll);
        cancelAnimationFrame(queued);
        resizer.disconnect();
        meter.dispose();
        root.replaceChildren();
        root.adoptedStyleSheets = [];
      },
    };
  },
};

// The contract requires the module's default export (LLD-02 §3).
export default target;
