import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "framer-motion";
import type { TargetModule } from "@tv/contract";
import { AstApp } from "@/AstApp";
import { AstDataProvider, createAstData } from "@/data";
import { AstNavProvider } from "@/nav";
import { AstStoreProvider, createAstStore, isMode } from "@/store";
import { adoptStyles } from "@/styles";

// ── AST target entry (LLD-02 §3) ───────────────────────────────────────
// Everything the AST needs arrives through ctx; it renders only inside
// the shadow root it is given.

function ReadyAfterPaint({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const frame = requestAnimationFrame(() => onReady());
    return () => cancelAnimationFrame(frame);
  }, [onReady]);
  return null;
}

const target: TargetModule = {
  mount(root, ctx) {
    adoptStyles(root);
    const container = document.createElement("div");
    container.className = "h-full";
    root.append(container);

    const store = createAstStore({
      params: ctx.params,
      focus: ctx.focus,
      visited: ctx.visited,
      inset: ctx.inset,
      nav: ctx.nav,
      storage: ctx.storage,
    });
    // A stored mode the URL does not mention goes back into the URL.
    const { mode } = store.getState();
    if (!isMode(ctx.params.mode) && mode !== "parse") ctx.nav.setParam("mode", mode);

    const offs = [
      ctx.bus.on("entity:visited", (e) => store.getState().markVisited(e.id)),
      ctx.bus.on("traversal:reset", () => store.getState().reset()),
      ctx.bus.on("chrome:inset", (e) => store.getState().setInset(e.inset)),
    ];

    const reactRoot = createRoot(container);
    reactRoot.render(
      <AstNavProvider value={ctx.nav}>
        <AstStoreProvider value={store}>
          <AstDataProvider value={createAstData(ctx.ir)}>
            {/* manifest.motion is "reduced-variant": with reduced motion,
                Framer skips transform animations (slide-ins, springs). */}
            <MotionConfig reducedMotion="user">
              <AstApp />
            </MotionConfig>
            <ReadyAfterPaint onReady={ctx.ready} />
          </AstDataProvider>
        </AstStoreProvider>
      </AstNavProvider>
    );

    return {
      setFocus: (id) => store.getState().receiveFocus(id),
      onParams: (params) => store.getState().receiveParams(params),
      unmount() {
        for (const off of offs) off();
        reactRoot.unmount();
        root.replaceChildren();
        root.adoptedStyleSheets = [];
      },
    };
  },
};

// The contract requires the module's default export (LLD-02 §3).
export default target;
