import { createContext, useContext } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import type { ChromeInset, Navigator, ScopedStorage } from "@tv/contract";
import type { TraversalMode } from "@/lib/ast-types";

// ── AST state (LLD-03 §8) ──────────────────────────────────────────────
// One store per mount, never a module singleton (LLD-02 §7.9).
// mode and expandedNodes are the AST's own (URL param + ctx.storage);
// visited, focus and inset mirror what the shell broadcasts.

const MODES: readonly TraversalMode[] = ["lex", "parse", "eval"];

export function isMode(value: string | undefined): value is TraversalMode {
  return value !== undefined && (MODES as readonly string[]).includes(value);
}

export interface AstState {
  mode: TraversalMode;
  expandedNodes: string[];
  visited: string[];
  focus: string | null;
  inset: ChromeInset;
  /** Node shown in the desktop inspector (parse mode only). */
  selected: string | null;

  // Visitor actions
  setMode(mode: TraversalMode): void;
  toggleExpand(slug: string): void;
  select(slug: string | null): void;
  /** Ask the shell to focus (and record a visit for) an entity. */
  requestFocus(slug: string): void;

  // Shell → target
  receiveFocus(id: string | null): void;
  receiveParams(params: Readonly<Record<string, string>>): void;
  markVisited(id: string): void;
  reset(): void;
  setInset(inset: ChromeInset): void;
}

export interface AstStoreInit {
  params: Readonly<Record<string, string>>;
  focus: string | null;
  visited: readonly string[];
  inset: ChromeInset;
  nav: Navigator;
  storage: ScopedStorage;
}

export function createAstStore(init: AstStoreInit): StoreApi<AstState> {
  const { nav, storage } = init;
  const storedMode = storage.get<string>("mode");
  const store = createStore<AstState>()((set, get) => ({
    mode: isMode(init.params.mode) ? init.params.mode : isMode(storedMode) ? storedMode : "parse",
    expandedNodes: storage.get<string[]>("expanded") ?? [],
    visited: [...init.visited],
    focus: init.focus,
    inset: init.inset,
    selected: null,

    setMode(mode) {
      set({ mode, selected: mode === "parse" ? get().selected : null });
      nav.setParam("mode", mode);
    },
    toggleExpand(slug) {
      const expanded = get().expandedNodes;
      set({
        expandedNodes: expanded.includes(slug) ? expanded.filter((s) => s !== slug) : [...expanded, slug],
      });
    },
    select(slug) {
      set({ selected: slug });
    },
    requestFocus(slug) {
      nav.focus(slug);
    },

    receiveFocus(id) {
      set({ focus: id });
    },
    receiveParams(params) {
      if (isMode(params.mode) && params.mode !== get().mode) {
        set({ mode: params.mode, selected: params.mode === "parse" ? get().selected : null });
      }
    },
    markVisited(id) {
      if (!get().visited.includes(id)) set({ visited: [...get().visited, id] });
    },
    reset() {
      set({ visited: [], expandedNodes: [], focus: null });
    },
    setInset(inset) {
      // Shell chrome opening over the target closes the inspector.
      set({ inset, selected: inset.right > 0 ? null : get().selected });
    },
  }));

  store.subscribe((state, prev) => {
    if (state.mode !== prev.mode) storage.set("mode", state.mode);
    if (state.expandedNodes !== prev.expandedNodes) storage.set("expanded", state.expandedNodes);
  });

  return store;
}

const AstStoreContext = createContext<StoreApi<AstState> | null>(null);

export const AstStoreProvider = AstStoreContext.Provider;

export function useAst<T>(selector: (state: AstState) => T): T {
  const store = useContext(AstStoreContext);
  if (!store) throw new Error("useAst must be used inside <AstStoreProvider>");
  return useStore(store, selector);
}
