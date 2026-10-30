import { createInstance } from "@module-federation/runtime";
import { CONTRACT_VERSION, parseManifest, satisfiesRange, type TargetModule } from "@tv/contract";
import { createFakeShell, type FakeMount } from "../runtime/fake-shell";

// ── Conformance page (LLD-02 §7) ───────────────────────────────────────
// Loads a built target the way the shell does (manifest.json, then the
// ESM remote entry through the MF runtime) and checks the obligations it
// can observe from the page. The Node runner reads the report.

export interface Check {
  id: string;
  title: string;
  status: "pass" | "fail" | "warn" | "manual";
  detail?: string;
}

// ── Instrumentation, installed before any target code runs ─────────────

const native = {
  raf: window.requestAnimationFrame.bind(window),
  caf: window.cancelAnimationFrame.bind(window),
  fetch: window.fetch.bind(window),
  pushState: history.pushState.bind(history),
  replaceState: history.replaceState.bind(history),
  getContext: HTMLCanvasElement.prototype.getContext,
};

const pendingFrames = new Set<number>();
window.requestAnimationFrame = (cb) => {
  const id = native.raf((t) => {
    pendingFrames.delete(id);
    cb(t);
  });
  pendingFrames.add(id);
  return id;
};
window.cancelAnimationFrame = (id) => {
  pendingFrames.delete(id);
  native.caf(id);
};

interface Listener {
  where: "window" | "document";
  type: string;
  fn: EventListenerOrEventListenerObject;
  capture: boolean;
}
const listeners = new Set<Listener>();
for (const [where, target] of [
  ["window", window],
  ["document", document],
] as const) {
  const add = target.addEventListener.bind(target);
  const remove = target.removeEventListener.bind(target);
  target.addEventListener = (type: string, fn: EventListenerOrEventListenerObject | null, opts?: boolean | AddEventListenerOptions) => {
    if (!fn) return;
    add(type, fn, opts);
    // `once` listeners remove themselves; they cannot outlive a target.
    if (typeof opts === "object" && opts.once) return;
    const capture = typeof opts === "boolean" ? opts : !!opts?.capture;
    for (const l of listeners) if (l.where === where && l.type === type && l.fn === fn && l.capture === capture) return;
    const entry: Listener = { where, type, fn, capture };
    listeners.add(entry);
    if (typeof opts === "object" && opts.signal) {
      opts.signal.addEventListener("abort", () => listeners.delete(entry), { once: true });
    }
  };
  target.removeEventListener = (type: string, fn: EventListenerOrEventListenerObject | null, opts?: boolean | EventListenerOptions) => {
    if (!fn) return;
    remove(type, fn, opts);
    const capture = typeof opts === "boolean" ? opts : !!opts?.capture;
    for (const l of listeners) if (l.where === where && l.type === type && l.fn === fn && l.capture === capture) listeners.delete(l);
  };
}

const historyWrites: string[] = [];
history.pushState = (...args: Parameters<History["pushState"]>) => {
  historyWrites.push("pushState");
  native.pushState(...args);
};
history.replaceState = (...args: Parameters<History["replaceState"]>) => {
  historyWrites.push("replaceState");
  native.replaceState(...args);
};

const fetched: string[] = [];
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  fetched.push(new URL(input instanceof Request ? input.url : String(input), location.href).pathname);
  return native.fetch(input, init);
};

const glContexts: (WebGLRenderingContext | WebGL2RenderingContext)[] = [];
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: unknown[]) {
  const ctx = (native.getContext as (...a: unknown[]) => RenderingContext | null).apply(this, args);
  if (ctx && (args[0] === "webgl" || args[0] === "webgl2" || args[0] === "experimental-webgl")) {
    glContexts.push(ctx as WebGLRenderingContext);
  }
  return ctx;
} as typeof HTMLCanvasElement.prototype.getContext;

const workers: { worker: Worker; terminated: boolean }[] = [];
const NativeWorker = window.Worker;
window.Worker = class extends NativeWorker {
  constructor(url: string | URL, options?: WorkerOptions) {
    super(url, options);
    const entry = { worker: this as Worker, terminated: false };
    workers.push(entry);
    const terminate = this.terminate.bind(this);
    this.terminate = () => {
      entry.terminated = true;
      terminate();
    };
  }
};

const errors: string[] = [];
window.addEventListener("error", (e) => errors.push(e.message || String(e.error)));
window.addEventListener("unhandledrejection", (e) => errors.push(`unhandled rejection: ${String(e.reason)}`));

// ── Helpers ────────────────────────────────────────────────────────────

const frame = () => new Promise<void>((resolve) => native.raf(() => resolve()));
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function frames(n: number) {
  for (let i = 0; i < n; i++) await frame();
}

function timeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([p, sleep(ms).then(() => Promise.reject(new Error(`${what} timed out after ${ms} ms`)))]);
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Watches the light DOM outside the stage for writes made by the target. */
function watchDocument(stage: HTMLElement) {
  const writes: string[] = [];
  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.target === stage || stage.contains(r.target)) continue;
      const node = r.target as Element;
      const where = node.nodeName.toLowerCase();
      if (r.type === "attributes") writes.push(`${where}[${r.attributeName}]`);
      else writes.push(`${where}: +${r.addedNodes.length} −${r.removedNodes.length}`);
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true });
  return {
    stop() {
      observer.takeRecords();
      observer.disconnect();
      return writes;
    },
  };
}

// ── The run ────────────────────────────────────────────────────────────

export async function run(id: string): Promise<{ checks: Check[]; version: string }> {
  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);

  // Resolve and load, as the shell's loader does.
  const res = await native.fetch(`/_t/${id}/manifest.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`manifest.json returned ${res.status}`);
  const manifest = parseManifest(await res.json());
  const shell = createFakeShell({ manifest });

  add({
    id: "manifest",
    title: "manifest.json parses, matches the contract and the IR",
    status:
      manifest.id === id && manifest.contract === CONTRACT_VERSION && satisfiesRange(shell.ir.version.schema, manifest.ir)
        ? "pass"
        : "fail",
    detail: `contract ${manifest.contract}, ir ${manifest.ir} (graph ${shell.ir.version.schema})`,
  });

  const mf = createInstance({ name: "tv_conformance", remotes: [] });
  mf.registerRemotes([{ name: manifest.entry.remote, entry: `/_t/${id}/${manifest.entry.url}`, type: "module" }]);
  const mod = await mf.loadRemote<{ default?: TargetModule }>(
    `${manifest.entry.remote}/${manifest.entry.expose.replace(/^\.\//, "")}`
  );
  const target = mod?.default;
  if (typeof target?.mount !== "function") throw new Error("the exposed module has no default export with mount()");

  // Baseline after loading: the MF runtime may have its own listeners.
  await frames(2);
  const baseline = new Set(listeners);
  // Listeners the first mount left behind. Frameworks register some once
  // per page and keep them for the module's lifetime (React's document
  // selectionchange, Framer's window resize root): reported as a warning.
  // Anything new after a later cycle grows with every mount and fails.
  let pageLifetime: Set<Listener> | null = null;
  const fetchStart = fetched.length;
  const historyStart = historyWrites.length;
  const errorStart = errors.length;

  const stage = document.createElement("div");
  stage.style.cssText = "position:fixed;inset:0";
  document.body.append(stage);
  const root = stage.attachShadow({ mode: "open" });
  const watch = watchDocument(stage);

  const lifecycle = async (label: string, reducedMotion: boolean) => {
    shell.reducedMotion = reducedMotion;
    let mounted: FakeMount;
    try {
      mounted = await timeout(shell.mount(target, root), 4000, "mount");
    } catch (err) {
      add({ id: `${label}.mount`, title: `${label}: mount resolves within 4 s`, status: "fail", detail: message(err) });
      return false;
    }
    try {
      await timeout(mounted.ready, 4000, "ctx.ready()");
      await sleep(500);
      const calls = mounted.readyCalls();
      add({
        id: `${label}.ready`,
        title: `${label}: calls ctx.ready() exactly once`,
        status: calls === 1 ? "pass" : "fail",
        detail: `${calls} call(s)`,
      });
    } catch (err) {
      add({ id: `${label}.ready`, title: `${label}: calls ctx.ready() exactly once`, status: "fail", detail: message(err) });
    }
    add({
      id: `${label}.renders`,
      title: `${label}: renders inside the root`,
      status: root.childNodes.length > 0 ? "pass" : "fail",
    });

    if (label === "first mount") {
      // Obligation 4: no focus, and every entity in the graph.
      const ids = [null, ...Object.keys(shell.ir.graph.entities)];
      const failures: string[] = [];
      const before = errors.length;
      for (const [i, focus] of ids.entries()) {
        try {
          mounted.handle.setFocus(focus, { source: "url" });
        } catch (err) {
          failures.push(`${focus}: ${message(err)}`);
        }
        if (i % 8 === 0) await frame();
      }
      mounted.handle.setFocus(null, { source: "url" });
      await sleep(300);
      failures.push(...errors.slice(before));
      add({
        id: "focus",
        title: `setFocus(null) and setFocus for all ${ids.length - 1} entities`,
        status: failures.length === 0 ? "pass" : "fail",
        detail: failures.slice(0, 5).join("; ") || undefined,
      });

      try {
        mounted.handle.suspend?.();
        await frames(2);
        mounted.handle.resume?.();
        add({ id: "suspend", title: "suspend() and resume() do not throw", status: "pass" });
      } catch (err) {
        add({ id: "suspend", title: "suspend() and resume() do not throw", status: "fail", detail: message(err) });
      }
    }

    try {
      await timeout(mounted.unmount(), 2000, "unmount");
    } catch (err) {
      add({ id: `${label}.unmount`, title: `${label}: unmount resolves within 2 s`, status: "fail", detail: message(err) });
      return false;
    }
    await frames(3);

    const leftover = [...listeners].filter((l) => !baseline.has(l));
    const once = pageLifetime;
    const grown = once ? leftover.filter((l) => !once.has(l)) : [];
    const kept = once ? leftover.filter((l) => once.has(l)) : leftover;
    pageLifetime ??= new Set(leftover);
    const live = workers.filter((w) => !w.terminated).length;
    const gl = glContexts.filter((c) => !c.isContextLost()).length;
    const names = (ls: Listener[]) => ls.map((l) => `${l.where}.${l.type}`).join(", ");
    const problems = [
      root.childNodes.length && `${root.childNodes.length} node(s) left in root`,
      pendingFrames.size && `${pendingFrames.size} rAF still scheduled`,
      grown.length && `listeners added again by this mount and left: ${names(grown)}`,
      live && `${live} worker(s) not terminated`,
      gl && `${gl} WebGL context(s) not lost`,
    ].filter(Boolean);
    add({
      id: `${label}.cleanup`,
      title: `${label}: unmount empties the root and releases everything`,
      status: problems.length > 0 ? "fail" : kept.length > 0 ? "warn" : "pass",
      detail:
        [...problems, kept.length && `page-lifetime listeners (registered once, not per mount): ${names(kept)}`]
          .filter(Boolean)
          .join("; ") || undefined,
    });
    return true;
  };

  // Obligation 9: mount, unmount, mount again in the same page. The
  // second mount runs with reduced motion on.
  const firstOk = await lifecycle("first mount", false);
  if (firstOk) await lifecycle("remount", true);

  const writes = watch.stop();
  stage.remove();

  add({
    id: "isolation",
    title: "writes nothing outside its root (document, head, body, history)",
    status: writes.length === 0 && historyWrites.length === historyStart ? "pass" : "fail",
    detail: [...writes.slice(0, 5), ...historyWrites.slice(historyStart)].join("; ") || undefined,
  });

  const irFetches = fetched.slice(fetchStart).filter((p) => p.startsWith("/ir/"));
  add({
    id: "no-ir-fetch",
    title: "never fetches /ir/* (data comes from ctx.ir)",
    status: irFetches.length === 0 ? "pass" : "fail",
    detail: irFetches.slice(0, 3).join(", ") || undefined,
  });

  const runtimeErrors = errors.slice(errorStart);
  add({
    id: "errors",
    title: "no uncaught errors",
    status: runtimeErrors.length === 0 ? "pass" : "fail",
    detail: runtimeErrors.slice(0, 5).join("; ") || undefined,
  });

  add({
    id: "motion",
    title: `honors env.reducedMotion as "${manifest.motion}"`,
    status: "manual",
    detail: "mounted with reduced motion above without errors; check the variant by eye in dev:standalone",
  });
  if (manifest.a11y !== "full") {
    add({
      id: "a11y",
      title: `a11y "${manifest.a11y}": pointer selection calls ctx.nav.focus`,
      status: "manual",
      detail: "not automated yet",
    });
  }

  return { checks, version: manifest.version };
}

declare global {
  interface Window {
    __tvConformance: { run: typeof run };
  }
}

window.__tvConformance = { run };
