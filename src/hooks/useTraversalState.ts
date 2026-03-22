import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ContextWindowEntry, TraversalMode } from "@/lib/ast-types";

// ── Traversal State ────────────────────────────────────────────────────
// Global state for the portfolio traversal experience.
// Persisted to sessionStorage so state survives page navigations
// but resets on new sessions (intentional — each visit is a fresh traversal).

interface TraversalState {
  // State
  visitedNodes: string[]; // Using array instead of Set for JSON serialization
  currentMode: TraversalMode;
  contextWindow: ContextWindowEntry[];
  expandedNodes: string[]; // Using array instead of Set for JSON serialization

  // Actions
  visitNode: (slug: string, label: string, type: ContextWindowEntry["type"]) => void;
  setMode: (mode: TraversalMode) => void;
  toggleExpand: (slug: string) => void;
  resetTraversal: () => void;

  // Derived helpers
  isVisited: (slug: string) => boolean;
  isExpanded: (slug: string) => boolean;
}

export const useTraversalState = create<TraversalState>()(
  persist(
    (set, get) => ({
      // ── Initial state ──────────────────────────────────────────────
      visitedNodes: [],
      currentMode: "parse",
      contextWindow: [],
      expandedNodes: [],

      // ── Actions ────────────────────────────────────────────────────

      visitNode: (slug, label, type) => {
        const state = get();
        // Don't add duplicates to visitedNodes
        if (state.visitedNodes.includes(slug)) return;

        set({
          visitedNodes: [...state.visitedNodes, slug],
          contextWindow: [
            ...state.contextWindow,
            {
              slug,
              label,
              type,
              visitedAt: Date.now(),
            },
          ],
        });
      },

      setMode: (mode) => {
        set({ currentMode: mode });
      },

      toggleExpand: (slug) => {
        const state = get();
        const isCurrentlyExpanded = state.expandedNodes.includes(slug);

        set({
          expandedNodes: isCurrentlyExpanded
            ? state.expandedNodes.filter((s) => s !== slug)
            : [...state.expandedNodes, slug],
        });
      },

      resetTraversal: () => {
        set({
          visitedNodes: [],
          contextWindow: [],
          expandedNodes: [],
          // Intentionally don't reset currentMode
        });
      },

      // ── Derived helpers ────────────────────────────────────────────

      isVisited: (slug) => {
        return get().visitedNodes.includes(slug);
      },

      isExpanded: (slug) => {
        return get().expandedNodes.includes(slug);
      },
    }),
    {
      name: "traversal-state",
      storage: createJSONStorage(() => {
        // Guard against SSR — sessionStorage doesn't exist on the server
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return sessionStorage;
      }),
      // Only persist these fields — derived helpers and actions are recreated
      partialize: (state) => ({
        visitedNodes: state.visitedNodes,
        currentMode: state.currentMode,
        contextWindow: state.contextWindow,
        expandedNodes: state.expandedNodes,
      }),
    }
  )
);
