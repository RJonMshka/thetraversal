import { render } from "preact";
import type { TargetModule, TelemetryEvent } from "@tv/contract";
import { App } from "@/App";
import { MAX_ROWS, announcement, previousTarget } from "@/model";
import { adoptStyles } from "@/styles";

// ── metrics target entry (LLD-02 §3, LLD-05 §6) ────────────────────────
// The platform measuring itself. Phase 6a: this tab's telemetry, live,
// through ctx.data.metrics (capability "metrics-read"). Preact renders
// into the shadow root it is given; nothing outside it is touched.

const target: TargetModule = {
  mount(root, ctx) {
    ctx.telemetry.mark("mount");
    adoptStyles(root);
    const host = document.createElement("div");
    host.className = "host";
    root.append(host);

    const events: TelemetryEvent[] = [];
    const keys = new WeakMap<TelemetryEvent, number>();
    let seq = 0;
    let focus = ctx.focus;
    let announce = "";
    let scheduled = false;
    let alive = true;

    const setInset = (right: number) => host.style.setProperty("--inset-right", `${right}px`);
    setInset(ctx.inset.right);

    const back = (to: string) => ctx.nav.switchTarget(to, ctx.focus ? { focus: ctx.focus } : undefined);

    const draw = () => {
      scheduled = false;
      if (!alive) return;
      const entity = focus ? ctx.ir.entity(focus) : undefined;
      render(
        <App
          self={ctx.id}
          events={events}
          focus={entity ? { id: entity.id, label: entity.label } : null}
          sending={ctx.data?.metrics?.sending ?? { on: false, why: "no-ingest" }}
          timeOrigin={performance.timeOrigin}
          announce={announce}
          keyOf={(e) => keys.get(e) ?? -1}
          onBack={back}
          onOpen={(id) => ctx.nav.open(id)}
        />,
        host
      );
    };
    // The buffer replays in one burst: render once per task, not per event.
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(draw);
    };

    const off =
      ctx.data?.metrics?.live((e) => {
        keys.set(e, seq++);
        events.push(e);
        if (events.length > MAX_ROWS) events.shift();
        announce = announcement(e) ?? announce;
        schedule();
      }) ?? (() => {});

    // Escape goes back to the target the visitor came from, while focus
    // is in this root, on its host, or nowhere in particular.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const origin = e.composedPath()[0];
      const inside = origin instanceof Node && (origin === root.host || root.contains(origin));
      const idle = origin === document.body || origin === document.documentElement;
      if (!inside && !idle) return;
      const to = previousTarget(events, ctx.id);
      if (!to) return;
      e.preventDefault();
      back(to);
    };
    window.addEventListener("keydown", onKey);
    const offInset = ctx.bus.on("chrome:inset", (e) => setInset(e.inset.right));

    draw();
    const frame = requestAnimationFrame(() => {
      ctx.telemetry.mark("first_frame");
      ctx.ready();
    });

    return {
      setFocus(id) {
        if ((id ?? null) === focus) return;
        focus = id;
        schedule();
      },
      unmount() {
        alive = false;
        cancelAnimationFrame(frame);
        off();
        offInset();
        window.removeEventListener("keydown", onKey);
        render(null, host);
        root.replaceChildren();
        root.adoptedStyleSheets = [];
      },
    };
  },
};

// The contract requires the module's default export (LLD-02 §3).
export default target;
