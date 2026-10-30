import type { TargetManifest, TargetModule } from "@tv/contract";
import { FONTS, THEMES, applyTheme, loadPersistedTheme, themeSnapshot, type FontName, type ThemeName } from "@tv/tokens";
import { createFakeShell, type FakeMount, type NavCall } from "../runtime/fake-shell";

// ── Standalone harness (LLD-04 §9) ─────────────────────────────────────
// `pnpm --filter @tv/target-<id> dev:standalone`. Mounts the target from
// source into a fake shell with a theme picker, a focus picker (every
// entity), a reduced-motion toggle, the target's URL params, and buttons
// for suspend, resume, unmount and remount. Plain DOM on purpose: the
// harness must not share a framework with the target it hosts.

export interface HarnessOptions {
  manifest: TargetManifest;
  load: () => Promise<TargetModule>;
}

const BAR_HEIGHT = 44;

const HARNESS_CSS = `
  html, body { margin: 0; height: 100%; background: var(--ink); color: var(--tv-text); }
  body { font: 12px/1.4 var(--mono, ui-monospace, monospace); }
  .tvh-bar { position: fixed; inset: 0 0 auto 0; height: ${BAR_HEIGHT}px; display: flex; gap: 10px;
    align-items: center; padding: 0 12px; border-bottom: 1px solid var(--line-2); background: var(--ink-2);
    overflow-x: auto; white-space: nowrap; z-index: 1; }
  .tvh-bar select, .tvh-bar button, .tvh-bar input { font: inherit; color: inherit; background: var(--ink);
    border: 1px solid var(--line-2); border-radius: 4px; padding: 3px 6px; }
  .tvh-bar button { cursor: pointer; }
  .tvh-bar button:focus-visible, .tvh-bar select:focus-visible, .tvh-bar input:focus-visible {
    outline: 2px solid var(--accent); outline-offset: 1px; }
  .tvh-id { color: var(--accent); }
  .tvh-status { color: var(--text-mute); min-width: 12ch; }
  .tvh-stage { position: fixed; inset: ${BAR_HEIGHT}px 0 0 0; }
  .tvh-log { position: fixed; right: 8px; bottom: 8px; max-width: 46ch; max-height: 30vh; overflow: auto;
    margin: 0; padding: 6px 8px; border: 1px solid var(--line-2); border-radius: 4px; background: var(--ink-2);
    color: var(--text-mute); font-size: 11px; z-index: 1; }
  .tvh-log:empty { display: none; }
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: (Node | string)[] = []
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function select<T extends string>(label: string, options: [T, string][], value: T, onChange: (v: T) => void) {
  const s = el("select", { title: label });
  s.setAttribute("aria-label", label);
  for (const [v, text] of options) s.append(el("option", { value: v, textContent: text, selected: v === value }));
  s.addEventListener("change", () => onChange(s.value as T));
  return s;
}

function button(text: string, onClick: () => void) {
  const b = el("button", { type: "button", textContent: text });
  b.addEventListener("click", onClick);
  return b;
}

export function startHarness({ manifest, load }: HarnessOptions): void {
  const style = el("style", { textContent: HARNESS_CSS });
  document.head.append(style);

  const persisted = loadPersistedTheme();
  let theme: ThemeName = persisted.theme;
  let font: FontName = persisted.font;
  applyTheme(theme, font);

  const status = el("span", { className: "tvh-status", textContent: "loading" });
  const log = el("pre", { className: "tvh-log" });
  const write = (line: string) => {
    log.textContent = `${line}\n${log.textContent ?? ""}`.split("\n").slice(0, 40).join("\n").trim();
  };

  const stage = el("div", { className: "tvh-stage" });
  const root = stage.attachShadow({ mode: "open" });

  const shell = createFakeShell({
    manifest,
    onNav: (call: NavCall) => {
      write(`nav.${call.kind} ${JSON.stringify({ ...call, kind: undefined })}`);
      if (call.kind === "focus") focusPicker.value = call.id;
    },
  });
  let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let module: TargetModule | null = null;
  let mounted: FakeMount | null = null;
  let busy = Promise.resolve();

  const run = (label: string, fn: () => Promise<void> | void) => {
    busy = busy.then(async () => {
      try {
        await fn();
      } catch (err) {
        status.textContent = `${label} failed`;
        write(`✗ ${label}: ${err instanceof Error ? err.message : String(err)}`);
        console.error(err);
      }
    });
  };

  const mount = () =>
    run("mount", async () => {
      if (mounted) return;
      module ??= await load();
      status.textContent = "mounting";
      const t0 = performance.now();
      shell.reducedMotion = reducedMotion;
      const m = await shell.mount(module, root);
      mounted = m;
      await m.ready;
      status.textContent = `ready ${Math.round(performance.now() - t0)} ms`;
      write(`mounted, ready ×${m.readyCalls()}`);
    });

  const unmount = () =>
    run("unmount", async () => {
      if (!mounted) return;
      const m = mounted;
      mounted = null;
      await m.unmount();
      status.textContent = "unmounted";
      write(`unmounted, root has ${root.childNodes.length} nodes`);
    });

  // Focus picker: every entity, indented by depth.
  const focusOptions: [string, string][] = [["", "(no focus)"]];
  shell.ir.walk((e, depth) => {
    focusOptions.push([e.id, `${"· ".repeat(depth)}${e.label} [${e.kind}]`]);
  });
  const focusPicker = select("focus", focusOptions, shell.focus ?? "", (id) => {
    shell.focus = id || null;
    mounted?.handle.setFocus(shell.focus, { source: "url" });
    shell.bus.emit({ type: "focus:changed", id: shell.focus, source: "url" });
  });

  const themePicker = select(
    "theme",
    (Object.keys(THEMES) as ThemeName[]).map((t) => [t, t]),
    theme,
    (t) => {
      theme = t;
      applyTheme(theme, font);
      const snapshot = themeSnapshot(theme, font);
      mounted?.handle.onTheme?.(snapshot);
      shell.bus.emit({ type: "theme:changed", theme: snapshot });
    }
  );
  const fontPicker = select(
    "font",
    (Object.keys(FONTS) as FontName[]).map((f) => [f, f]),
    font,
    (f) => {
      font = f;
      applyTheme(theme, font);
      const snapshot = themeSnapshot(theme, font);
      mounted?.handle.onTheme?.(snapshot);
      shell.bus.emit({ type: "theme:changed", theme: snapshot });
    }
  );

  // Target-owned URL params, as free text (empty removes the key).
  const paramInputs = manifest.urlParams.map((key) => {
    const input = el("input", { size: 8, placeholder: key, title: `param ${key}` });
    input.setAttribute("aria-label", `param ${key}`);
    input.addEventListener("change", () => {
      const next = { ...shell.params };
      if (input.value) next[key] = input.value;
      else delete next[key];
      shell.params = next;
      mounted?.handle.onParams?.(next);
    });
    return input;
  });

  const motion = el("input", { type: "checkbox", checked: reducedMotion });
  motion.addEventListener("change", () => {
    reducedMotion = motion.checked;
    write(`reduced motion ${reducedMotion ? "on" : "off"} (applies on remount)`);
  });

  document.body.append(
    el("div", { className: "tvh-bar" }, [
      el("span", { className: "tvh-id", textContent: manifest.flag }),
      status,
      focusPicker,
      themePicker,
      fontPicker,
      ...paramInputs,
      el("label", {}, [motion, " reduced motion"]),
      button("suspend", () => mounted?.handle.suspend?.()),
      button("resume", () => mounted?.handle.resume?.()),
      button("unmount", unmount),
      button("remount", () => {
        unmount();
        mount();
      }),
    ]),
    stage,
    log
  );

  mount();
}
