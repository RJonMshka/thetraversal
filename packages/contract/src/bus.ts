import type { Bus, ShellEvent, ShellEventOf, ShellEventType } from "./types";

// ── Bus runtime (LLD-02 §5) ────────────────────────────────────────────
// The shell owns one ShellBus and hands each target a scoped view whose
// subscriptions are tracked and force-cleared on unmount.

type Listener = (e: ShellEvent) => void;

export interface ScopedBus {
  readonly bus: Bus;
  /** Drops every subscription made through this view. Idempotent. */
  dispose(): void;
}

export interface ShellBus extends Bus {
  emit(event: ShellEvent): void;
  scope(): ScopedBus;
}

export function createBus(): ShellBus {
  const listeners = new Map<ShellEventType, Set<Listener>>();

  const on = <T extends ShellEventType>(type: T, fn: (e: ShellEventOf<T>) => void) => {
    const set = listeners.get(type) ?? new Set<Listener>();
    listeners.set(type, set);
    const listener = fn as Listener; // only ever called with events of `type`
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  };

  return {
    on,
    emit(event) {
      // Copy so a listener that unsubscribes during emit does not skip others.
      for (const fn of [...(listeners.get(event.type) ?? [])]) {
        try {
          fn(event);
        } catch (err) {
          // One faulty listener must not stop delivery to the rest.
          queueMicrotask(() => {
            throw err;
          });
        }
      }
    },
    scope() {
      const offs = new Set<() => void>();
      let disposed = false;
      return {
        bus: {
          on(type, fn) {
            if (disposed) return () => {};
            const off = on(type, fn);
            const tracked = () => {
              off();
              offs.delete(tracked);
            };
            offs.add(tracked);
            return tracked;
          },
        },
        dispose() {
          disposed = true;
          for (const off of [...offs]) off();
        },
      };
    },
  };
}
