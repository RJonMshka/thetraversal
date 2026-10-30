"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ChromeInset, FocusSource } from "@tv/contract";
import { themeSnapshot } from "@tv/tokens";
import { cn } from "@/lib/utils";
import { ir } from "@/platform/ir";
import { shellBus } from "@/platform/bus";
import { loader } from "@/platform/loader";
import type { TargetId } from "@/platform/registry";
import { buildContext, clearScopedStorage } from "@/platform/host/context";
import { diagnose, reportTargetError, toTargetError, type Diagnostic } from "@/platform/host/errors";
import { guard, mountTarget, type MountedTarget } from "@/platform/host/lifecycle";
import { FOCUS_PARAM, createNavigator, pickParams, resolveFocus, targetHref } from "@/platform/focus";
import { useShellStore } from "@/state/shell-store";

// ── TargetHost (LLD-03 §2, §6, §7) ─────────────────────────────────────
// Owns one target's mount lifecycle inside a shadow root, and is the
// bridge between the URL (focus, target params) and the mounted handle.
// The server-rendered outline (children) shows until the target is ready
// and stays as the fallback if it fails.

type Status = "loading" | "ready" | "error";

interface TargetHostProps {
  targetId: TargetId;
  /** Area of the target covered by shell chrome. */
  inset: ChromeInset;
  /** A target moved focus itself (shell chrome may react, e.g. close a panel). */
  onTargetFocus?: (id: string) => void;
  children: ReactNode;
}

function visitEntity(id: string | null) {
  const entity = id ? ir.entity(id) : undefined;
  if (entity) useShellStore.getState().visit(entity);
}

function sameParams(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>) {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
}

export function TargetHost({ targetId, inset, onTargetFocus, children }: TargetHostProps) {
  const router = useRouter();
  const search = useSearchParams();
  const hasHydrated = useShellStore((s) => s.hasHydrated);

  const stageRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef<MountedTarget | null>(null);
  // Settles when the previous mount has fully unmounted; the next mount
  // waits for it so two targets never share the shadow root.
  const settledRef = useRef<Promise<void>>(Promise.resolve());
  const pendingSourceRef = useRef<FocusSource | null>(null);
  const urlFocusRef = useRef<string | null>(null);
  const paramsRef = useRef<Readonly<Record<string, string>>>({});
  const insetRef = useRef(inset);
  const onTargetFocusRef = useRef(onTargetFocus);

  const [status, setStatus] = useState<Status>("loading");
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [mountKey, setMountKey] = useState(0);

  useEffect(() => {
    onTargetFocusRef.current = onTargetFocus;
  }, [onTargetFocus]);

  // ── Mount / unmount ────────────────────────────────────────────────
  useEffect(() => {
    const stage = stageRef.current;
    if (!hasHydrated || !stage) return;

    const abort = new AbortController();
    const root = stage.shadowRoot ?? stage.attachShadow({ mode: "open" });
    const searchNow = new URLSearchParams(window.location.search);
    const urlFocus = resolveFocus(searchNow.get(FOCUS_PARAM), ir);
    const visited = useShellStore.getState().visited.map((v) => v.id);
    urlFocusRef.current = urlFocus;
    visitEntity(urlFocus);

    let mounted: MountedTarget | null = null;
    const run = settledRef.current.then(() => {
      if (abort.signal.aborted) return;
      return mountTarget({
        id: targetId,
        root,
        loader,
        ir,
        bus: shellBus,
        signal: abort.signal,
        makeContext: (manifest, lifecycle) => {
          const params = pickParams(searchNow, manifest.urlParams);
          paramsRef.current = params;
          const nav = createNavigator({
            manifest,
            ir,
            search: () => new URLSearchParams(window.location.search),
            replace: (href) => window.history.replaceState(null, "", href),
            push: (href) => router.push(href),
            onFocusRequest: (id, source) => {
              pendingSourceRef.current = source;
              onTargetFocusRef.current?.(id);
            },
            onOpen: (id) => visitEntity(id),
          });
          return buildContext({
            manifest,
            ir,
            // With no focus in the URL, resume where the visitor left off.
            focus: urlFocus ?? visited.at(-1) ?? null,
            params,
            visited: useShellStore.getState().visited.map((v) => v.id),
            inset: insetRef.current,
            theme: themeSnapshot(),
            nav,
            bus: lifecycle.bus,
            signal: lifecycle.signal,
            ready: lifecycle.ready,
          });
        },
      }).then(
        (result) => {
          mounted = result;
          mountedRef.current = result;
          setDiagnostic(null);
          setStatus("ready");
        },
        (err: unknown) => {
          if (abort.signal.aborted) return;
          const error = toTargetError(err, targetId, "T0005");
          reportTargetError(error);
          setDiagnostic(diagnose(error));
          setStatus("error");
        }
      );
    });

    return () => {
      abort.abort();
      mountedRef.current = null;
      setStatus("loading");
      // Unmount after React finishes this commit (a React target cannot
      // unmount its root mid-render), then let the next mount proceed.
      settledRef.current = run.then(() => mounted?.unmount());
    };
    // `router` is stable; the URL is read once per mount on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, targetId, mountKey]);

  // ── URL → focus and params ─────────────────────────────────────────
  useEffect(() => {
    const mounted = mountedRef.current;
    if (!mounted || status !== "ready") return;

    const raw = search.get(FOCUS_PARAM);
    const focus = resolveFocus(raw, ir);
    if (raw !== null && focus === null) {
      // Unknown id: clean the URL; the cleaned URL comes back through here.
      const params = pickParams(search, mounted.manifest.urlParams);
      window.history.replaceState(null, "", targetHref(targetId, { params }));
      return;
    }
    if (focus !== urlFocusRef.current) {
      urlFocusRef.current = focus;
      const source = pendingSourceRef.current ?? "url";
      pendingSourceRef.current = null;
      visitEntity(focus);
      guard(targetId, () => mounted.handle.setFocus(focus, { source }));
      shellBus.emit({ type: "focus:changed", id: focus, source });
    }

    const params = pickParams(search, mounted.manifest.urlParams);
    if (!sameParams(params, paramsRef.current)) {
      paramsRef.current = params;
      guard(targetId, () => mounted.handle.onParams?.(params));
    }
  }, [search, status, targetId]);

  // ── Shell state → bus ──────────────────────────────────────────────
  useEffect(
    () =>
      useShellStore.subscribe((state, prev) => {
        if (state.visited === prev.visited) return;
        if (state.visited.length === 0 && prev.visited.length > 0) {
          clearScopedStorage(targetId);
          shellBus.emit({ type: "traversal:reset" });
          return;
        }
        const known = new Set(prev.visited.map((v) => v.id));
        for (const v of state.visited) {
          if (!known.has(v.id)) shellBus.emit({ type: "entity:visited", id: v.id });
        }
      }),
    [targetId]
  );

  useEffect(() => {
    const prev = insetRef.current;
    insetRef.current = inset;
    if (prev.top === inset.top && prev.right === inset.right && prev.bottom === inset.bottom && prev.left === inset.left) {
      return;
    }
    shellBus.emit({ type: "chrome:inset", inset });
  }, [inset]);

  useEffect(() => {
    const onVisibility = () => {
      const hidden = document.visibilityState === "hidden";
      const mounted = mountedRef.current;
      if (mounted) guard(targetId, () => (hidden ? mounted.handle.suspend?.() : mounted.handle.resume?.()));
      shellBus.emit({ type: "visibility", hidden });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [targetId]);

  const showRemount = process.env.NODE_ENV !== "production" && search.get("remount") === "1";

  return (
    <div className="relative h-full w-full" data-target-host={targetId} data-target-state={status}>
      {status !== "ready" && <div className="absolute inset-0 overflow-y-auto">{children}</div>}
      <div ref={stageRef} data-target={targetId} className={cn("absolute inset-0", status !== "ready" && "invisible")} />
      {diagnostic && <TargetDiagnostic diagnostic={diagnostic} />}
      {showRemount && (
        <button
          type="button"
          onClick={() => setMountKey((k) => k + 1)}
          className="tv-chip fixed bottom-14 left-4 z-50"
          style={{ cursor: "pointer" }}
        >
          remount {targetId}
        </button>
      )}
    </div>
  );
}

function TargetDiagnostic({ diagnostic }: { diagnostic: Diagnostic }) {
  return (
    <div
      role="alert"
      className="absolute inset-x-4 top-4 z-40 rounded-md border px-4 py-3 font-mono text-xs leading-6"
      style={{ borderColor: "var(--line-2)", background: "var(--ink-2)", color: "var(--tv-text)" }}
    >
      <div>
        <span className="text-ctp-red">error[{diagnostic.code}]</span>
        {diagnostic.title.replace(/^error\[T\d{4}\]/, "")}
      </div>
      <div style={{ color: "var(--text-mute)" }}>  = note: {diagnostic.note}</div>
    </div>
  );
}
