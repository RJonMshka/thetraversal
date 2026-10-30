import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Kind } from "@tv/ir";

// ── Shell state (LLD-03 §8) ────────────────────────────────────────────
// What the visitor has seen, across every target and /node page.
// sessionStorage: survives navigation, resets with a new session.

export interface VisitEntry {
  id: string;
  label: string;
  kind: Kind;
  visitedAt: number;
}

interface ShellState {
  visited: VisitEntry[];
  /** True once sessionStorage has been read; targets mount only after this. */
  hasHydrated: boolean;
  visit: (entity: { id: string; label: string; kind: Kind }) => void;
  reset: () => void;
}

const noStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

export const useShellStore = create<ShellState>()(
  persist(
    (set, get) => ({
      visited: [],
      hasHydrated: false,
      visit: ({ id, label, kind }) => {
        if (get().visited.some((v) => v.id === id)) return;
        set({ visited: [...get().visited, { id, label, kind, visitedAt: Date.now() }] });
      },
      reset: () => set({ visited: [] }),
    }),
    {
      name: "tv.shell.traversal",
      storage: createJSONStorage(() => (typeof window === "undefined" ? noStorage : sessionStorage)),
      partialize: (s) => ({ visited: s.visited }),
      onRehydrateStorage: () => () => {
        // The store is still being assigned when this runs synchronously.
        queueMicrotask(() => useShellStore.setState({ hasHydrated: true }));
      },
    }
  )
);
