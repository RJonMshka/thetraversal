import type { ChromeInset, TargetModule } from "@tv/contract";
import { buildModel, layout } from "@/model";
import { buildPalette } from "@/palette";
import { createPiece } from "@/render";
import { adoptStyles } from "@/styles";

// ── art target entry (LLD-02 §3, MIGRATION Phase 7) ────────────────────
// The portfolio as dataflow: every entity is an emitter on the ring of its
// contains depth, particles flow down the tree, and relations (uses,
// implements) pull them across. Decorative: the shell renders the
// accessible entity list beside it. Vanilla TypeScript on a 2D canvas.

const PICK_SLOP = { fine: 12, coarse: 22 } as const;
const CLICK_SLOP = 6;

const target: TargetModule = {
  mount(root, ctx) {
    ctx.telemetry.mark("mount");
    adoptStyles(root);
    const stage = document.createElement("div");
    stage.className = "stage";
    root.append(stage);

    const model = buildModel(ctx.ir);
    const placed = layout(model);
    const piece = createPiece(model, placed, buildPalette(ctx.theme), {
      // manifest.motion is "static-fallback": one still frame under reduced motion.
      animate: !ctx.env.reducedMotion,
      lean: ctx.env.saveData || Math.min(ctx.env.viewport.width, ctx.env.viewport.height) < 500,
    });
    const canvas = piece.canvas;
    canvas.setAttribute("aria-hidden", "true");
    stage.append(canvas);

    const focusLabel = document.createElement("div");
    focusLabel.className = "lbl focus";
    focusLabel.hidden = true;
    const hoverLabel = document.createElement("div");
    hoverLabel.className = "lbl";
    hoverLabel.hidden = true;
    const caption = document.createElement("p");
    caption.className = "caption";
    caption.setAttribute("aria-hidden", "true");
    caption.innerHTML =
      '<span class="kw">dataflow</span> · every entity an emitter, every relation a pull<span class="more"> · click to focus · double-click or enter to open · esc steps out</span>';
    stage.append(focusLabel, hoverLabel, caption);

    let inset: ChromeInset = ctx.inset;
    let focus: string | null = null;
    let hover: string | null = null;

    const placeLabel = (el: HTMLElement, id: string | null, text: string) => {
      const at = id ? piece.toScreen(id) : null;
      el.hidden = !at;
      if (!at) return;
      el.textContent = text;
      if (el === focusLabel && id) {
        const open = document.createElement("span");
        open.className = "open";
        open.textContent = "↵ open";
        el.append(open);
      }
      // Above the dot, kept inside the stage.
      const w = el.offsetWidth;
      const x = Math.min(Math.max(at.x - w / 2, inset.left + 4), stage.clientWidth - inset.right - w - 4);
      const y = Math.max(at.y - 30, inset.top + 4);
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    };
    const labels = () => {
      placeLabel(focusLabel, focus, focus ? (model.nodes.get(focus)?.label ?? "") : "");
      const h = hover && hover !== focus ? hover : null;
      placeLabel(hoverLabel, h, h ? (model.nodes.get(h)?.label ?? "") : "");
    };
    const setInsetVars = () => {
      for (const side of ["top", "right", "bottom", "left"] as const) stage.style.setProperty(`--inset-${side}`, `${inset[side]}px`);
    };

    function show(id: string | null) {
      focus = id && model.nodes.has(id) && id !== model.root ? id : null;
      piece.setFocus(focus);
      labels();
    }
    /** The visitor moved focus inside the piece: show it now, tell the shell (LLD-02 §7.7). */
    function request(id: string) {
      if (id === (focus ?? model.root)) return;
      show(id);
      ctx.nav.focus(id);
    }
    const parentOf = (id: string | null) => (id ? (model.nodes.get(id)?.parent ?? null) : null);

    // ── Keys: same gate as the other targets (inside this root, on its
    // host, or nothing focused; never in shell chrome). ────────────────
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const origin = e.composedPath()[0];
      const inside = origin instanceof Node && (origin === root.host || root.contains(origin));
      const idle = origin === document.body || origin === document.documentElement || origin === document || origin === window;
      if (!inside && !idle) return;
      if (e.key === "Escape" || e.key === "Backspace" || e.key === "ArrowUp") {
        const up = parentOf(focus);
        if (!up) return;
        e.preventDefault();
        request(up);
      } else if (e.key === "Enter" && focus) {
        e.preventDefault();
        ctx.nav.open(focus);
      } else if (e.key === "Home" && focus) {
        e.preventDefault();
        request(model.root);
      }
    };
    window.addEventListener("keydown", onKey);

    // ── Pointer: click an emitter to focus it, empty space steps out ──
    const slop = PICK_SLOP[ctx.env.pointer];
    const local = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_SLOP) return;
      down = null;
      const p = local(e);
      const id = piece.pick(p.x, p.y, slop);
      if (id) request(id);
      else {
        const up = parentOf(focus);
        if (up) request(up);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const p = local(e);
      const id = piece.pick(p.x, p.y, slop);
      if (id === hover) return;
      hover = id;
      canvas.classList.toggle("picking", id !== null);
      piece.setHover(id);
      labels();
    };
    const onLeave = () => {
      if (hover === null) return;
      hover = null;
      canvas.classList.remove("picking");
      piece.setHover(null);
      labels();
    };
    const onDouble = (e: MouseEvent) => {
      const p = local(e);
      const id = piece.pick(p.x, p.y, slop);
      if (id) ctx.nav.open(id);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("dblclick", onDouble);

    // ── Size, first frame, shell events ──────────────────────────────
    const resize = () => {
      piece.resize(stage.clientWidth, stage.clientHeight, window.devicePixelRatio || 1, inset);
      labels();
    };
    const resizer = new ResizeObserver(resize);
    resizer.observe(stage);
    setInsetVars();

    piece.onFrame(() => {
      ctx.telemetry.mark("first_frame");
      ctx.ready();
    });
    show(ctx.focus);
    resize();

    const offs = [
      ctx.bus.on("chrome:inset", (e) => {
        inset = e.inset;
        setInsetVars();
        resize();
      }),
    ];

    return {
      setFocus(id) {
        // The shell echoes our own requests back: treat them idempotently.
        if ((id ?? null) === focus) return;
        show(id);
      },
      onTheme(theme) {
        piece.setPalette(buildPalette(theme));
      },
      suspend: () => piece.pause(),
      resume: () => piece.resume(),
      unmount() {
        for (const off of offs) off();
        window.removeEventListener("keydown", onKey);
        resizer.disconnect();
        piece.dispose();
        root.replaceChildren();
        root.adoptedStyleSheets = [];
      },
    };
  },
};

// The contract requires the module's default export (LLD-02 §3).
export default target;
