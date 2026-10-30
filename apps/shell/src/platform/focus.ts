import { TargetError, type FocusSource, type Navigator, type TargetManifest } from "@tv/contract";
import type { IRClient } from "@tv/ir";
import { reportTargetError } from "@/platform/host/errors";

// ── Focus and URL (LLD-03 §7) ──────────────────────────────────────────
// The shell is the single writer of the URL. Targets ask through
// ctx.nav; focus changes inside a target replace the history entry,
// target switches and page opens push.

export const FOCUS_PARAM = "focus";

/** Unknown or missing ids become null. */
export function resolveFocus(raw: string | null, ir: IRClient): string | null {
  return raw && ir.entity(raw) ? raw : null;
}

/** The target-owned params present in `search`, in manifest order. */
export function pickParams(search: URLSearchParams, allowed: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of allowed) {
    const value = search.get(key);
    if (value !== null) out[key] = value;
  }
  return out;
}

export function targetHref(
  target: string,
  state: { params?: Readonly<Record<string, string>>; focus?: string | null }
): string {
  const search = new URLSearchParams(state.params);
  if (state.focus) search.set(FOCUS_PARAM, state.focus);
  const query = search.toString();
  return query ? `/t/${target}?${query}` : `/t/${target}`;
}

export interface NavigatorDeps {
  manifest: TargetManifest;
  ir: IRClient;
  /** Current URL search params (read at call time). */
  search: () => URLSearchParams;
  /** Replace the current history entry; Next keeps useSearchParams in sync. */
  replace: (href: string) => void;
  push: (href: string) => void;
  /** Called before the URL changes so the resulting focus change carries the source. */
  onFocusRequest: (id: string, source: FocusSource) => void;
  onOpen: (id: string) => void;
}

export function createNavigator(deps: NavigatorDeps): Navigator {
  const { manifest, ir } = deps;
  const current = () => {
    const search = deps.search();
    return { params: pickParams(search, manifest.urlParams), focus: search.get(FOCUS_PARAM) };
  };

  return {
    focus(id) {
      if (!ir.entity(id)) return;
      deps.onFocusRequest(id, "target");
      deps.replace(targetHref(manifest.id, { ...current(), focus: id }));
    },
    open(id) {
      if (!ir.entity(id)) return;
      deps.onOpen(id);
      deps.push(`/node/${id}`);
    },
    switchTarget(target, opts) {
      deps.push(targetHref(target, { focus: opts?.focus ?? current().focus }));
    },
    setParam(key, value) {
      if (!manifest.urlParams.includes(key)) {
        const err = new TargetError("T0008", manifest.id, `'${key}' is not in manifest.urlParams`);
        if (process.env.NODE_ENV !== "production") throw err;
        reportTargetError(err);
        return;
      }
      const { params, focus } = current();
      const next = { ...params };
      if (value === null) delete next[key];
      else next[key] = value;
      deps.replace(targetHref(manifest.id, { params: next, focus }));
    },
    external(url) {
      window.open(url, "_blank", "noopener,noreferrer");
    },
  };
}
