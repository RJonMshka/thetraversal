import type { TargetModule } from "@tv/contract";
import { computeLayout } from "@/layout";
import { buildModel, createMoveMemory, type Direction } from "@/model";
import { createOverlay } from "@/overlay";
import { buildPalette } from "@/palette";
import { createScene, type SceneApi } from "@/scene";
import { adoptStyles } from "@/styles";

// ── three target entry (LLD-02 §3) ─────────────────────────────────────
// The portfolio as compiler passes: one plane per contains depth. Vanilla
// TypeScript and three.js, no framework. Everything arrives through ctx;
// it renders only inside the shadow root it is given.

const KEY_MOVES: Record<string, Direction> = {
  ArrowUp: "up",
  Escape: "up",
  Backspace: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};
const WHEEL_ZOOM = 0.0035;
const CLICK_SLOP = 6; // px of pointer travel before a press counts as a drag

const target: TargetModule = {
  mount(root, ctx) {
    ctx.telemetry.mark("mount");
    adoptStyles(root);
    const stage = document.createElement("div");
    stage.className = "stage";
    root.append(stage);

    const model = buildModel(ctx.ir);
    const layout = computeLayout(model);
    const memory = createMoveMemory(model);

    let scene: SceneApi;
    try {
      scene = createScene(stage, model, layout, buildPalette(ctx.theme));
    } catch (err) {
      root.replaceChildren();
      root.adoptedStyleSheets = [];
      throw err;
    }

    ctx.telemetry.mark("scene");
    const canvas = scene.canvas;
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-roledescription", "3D scene");
    canvas.setAttribute(
      "aria-label",
      "Portfolio as stacked planes. Arrow keys move focus: up to the parent, down to a child, left and right through siblings. Escape steps out, Enter opens."
    );

    // manifest.motion is "static-fallback": with reduced motion the camera
    // jumps instead of flying, and nothing else ever animates.
    const instant = () => ctx.env.reducedMotion;
    let focus: string | null = null;

    const overlay = createOverlay({
      container: stage,
      model,
      layout,
      scene,
      coarsePointer: ctx.env.pointer === "coarse",
      onFocus: (id) => request(id),
      onOpen: (id) => ctx.nav.open(id),
    });
    overlay.setInset(ctx.inset);

    function show(id: string | null, animate: boolean) {
      focus = id && model.nodes.has(id) ? id : null;
      if (focus) memory.remember(focus);
      scene.setFocus(focus, { instant: !animate || instant() });
      overlay.setFocus(focus, memory.moves(focus ?? model.root));
    }
    /** The visitor moved focus inside the scene: show it now, tell the shell (LLD-02 §7.7). */
    function request(id: string) {
      if (id === focus) return;
      show(id, true);
      ctx.nav.focus(id);
    }
    const current = () => focus ?? model.root;

    // ── Keys ─────────────────────────────────────────────────────────
    // Work as soon as the page loads (nothing focused) or while focus is
    // inside this root, or on its host (the shell focuses the host after a
    // target switch); never while the visitor is in shell chrome.
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const origin = e.composedPath()[0];
      const inside = origin instanceof Node && (origin === root.host || root.contains(origin));
      const idle = origin === document.body || origin === document.documentElement || origin === document || origin === window;
      if (!inside && !idle) return;
      if (origin instanceof HTMLButtonElement && (e.key === "Enter" || e.key === " ")) return;

      const dir = KEY_MOVES[e.key];
      if (dir) {
        e.preventDefault();
        const to = memory.moves(current())[dir];
        if (to) request(to);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        ctx.nav.open(current());
      } else if (e.key === "Home") {
        e.preventDefault();
        request(model.root);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        scene.zoomBy(0.7, { instant: instant() });
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        scene.zoomBy(1.4, { instant: instant() });
      }
    };
    window.addEventListener("keydown", onKey);

    // ── Pointer: drag orbits, click focuses, empty click steps out ───
    const pointers = new Map<number, { x: number; y: number }>();
    let travel = 0;
    let pinch = 0;
    let hover: string | null = null;
    const setHover = (id: string | null) => {
      if (id === hover) return;
      hover = id;
      canvas.classList.toggle("picking", id !== null);
      scene.setHover(id);
      overlay.setHover(id);
    };

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      travel = 0;
    };
    const onMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) {
        if (e.pointerType === "mouse") setHover(scene.pick(e.clientX, e.clientY));
        return;
      }
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      travel += Math.abs(dx) + Math.abs(dy);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        if (pinch && d) scene.zoomTo((scene.radius * pinch) / d);
        pinch = d;
      } else {
        scene.orbit(dx, dy);
      }
    };
    const onUp = (e: PointerEvent) => {
      if (pointers.has(e.pointerId) && pointers.size === 1 && travel < CLICK_SLOP) {
        const id = scene.pick(e.clientX, e.clientY);
        if (id) request(id);
        else {
          const up = memory.moves(current()).up;
          if (up) request(up);
        }
      }
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
    };
    const onCancel = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
    };
    const onLeave = () => setHover(null);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      scene.zoomTo(scene.radius * Math.exp(dy * WHEEL_ZOOM));
    };
    const onDouble = (e: MouseEvent) => {
      const id = scene.pick(e.clientX, e.clientY);
      if (id) ctx.nav.open(id);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("dblclick", onDouble);

    // ── Size, first frame, shell events ──────────────────────────────
    const resizer = new ResizeObserver(() => scene.resize(stage.clientWidth, stage.clientHeight));
    resizer.observe(stage);
    scene.resize(stage.clientWidth, stage.clientHeight);

    let readied = false;
    scene.onFrame(() => {
      if (readied) return;
      readied = true;
      ctx.telemetry.mark("first_frame");
      ctx.ready();
    });

    const offs = [ctx.bus.on("chrome:inset", (e) => overlay.setInset(e.inset))];

    show(ctx.focus, false);

    return {
      setFocus(id) {
        // The shell echoes our own requests back: treat them idempotently.
        if ((id ?? null) === focus) return;
        show(id, true);
      },
      onTheme(theme) {
        scene.setPalette(buildPalette(theme));
      },
      suspend: () => scene.pause(),
      resume: () => scene.resume(),
      unmount() {
        for (const off of offs) off();
        window.removeEventListener("keydown", onKey);
        resizer.disconnect();
        overlay.dispose();
        scene.dispose();
        root.replaceChildren();
        root.adoptedStyleSheets = [];
      },
    };
  },
};

// The contract requires the module's default export (LLD-02 §3).
export default target;
