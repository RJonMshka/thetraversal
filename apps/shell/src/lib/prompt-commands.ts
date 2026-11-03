import type { Entity } from "@tv/ir";
import { ir } from "@/platform/ir";
import { LISTED_TARGETS, type TargetId } from "@/platform/registry";
import type { EasterEggResult } from "@/lib/easter-eggs";

// ── Landing prompt commands that read the IR ───────────────────────────
// `ls`, `cd`, `cat`, `tree` walk the real entity graph; `--target=<id>`
// opens a rendering target. The copy for each target is the shell's own
// (it never imports a target package), keyed by id.

export const FLAVORS: Partial<Record<TargetId, { title: string; line: string }>> = {
  ast: { title: "syntax tree", line: "lex, parse, eval: walk the portfolio as an AST, by keyboard or mouse" },
  three: { title: "compiler passes, in 3D", line: "one plane per depth; fly from the root down to every leaf" },
  build: { title: "the page, being built", line: "elements, box model, flex and grid, with the devtools overlay on" },
};

/** Listed targets that have landing copy, in registry order. */
export const FLAVOR_IDS: TargetId[] = LISTED_TARGETS.filter((id) => id in FLAVORS);

const lines = (content: string[]): EasterEggResult => ({ type: "lines", content });
const go = (text: string, url: string): EasterEggResult => ({
  type: "action",
  content: [text],
  action: { kind: "navigate", url },
});

/** Exact id, then exact label, then a unique id or label prefix. */
export function findEntity(query: string): Entity | undefined {
  const q = query.trim().toLowerCase().replace(/\/$/, "");
  const exact = ir.entity(q);
  if (exact) return exact;
  const all: Entity[] = [];
  ir.walk((e) => void all.push(e));
  const byLabel = all.find((e) => e.label.toLowerCase() === q);
  if (byLabel) return byLabel;
  const prefixed = all.filter((e) => e.id.startsWith(q) || e.label.toLowerCase().startsWith(q));
  return prefixed.length === 1 ? prefixed[0] : undefined;
}

function listing(id: string): string[] {
  return ir.children(id).map((c) => {
    const n = ir.children(c.id).length;
    return n > 0 ? `drwxr-xr-x  ${c.id}/ · ${n}` : `-rw-r--r--  ${c.id}`;
  });
}

function notFound(q: string): EasterEggResult {
  return lines([`no such node: ${q}`, "", "try `ls` to see what is here"]);
}

export function runIRCommand(raw: string): EasterEggResult | null {
  const s = raw.trim();
  let m: RegExpExecArray | null;

  if ((m = /^(?:--target=|target\s+|run\s+)(\S*)$/i.exec(s))) {
    const id = m[1].toLowerCase() as TargetId;
    if (FLAVOR_IDS.includes(id)) return go(`compiling for --target=${id}…`, `/t/${id}`);
    return lines([`unknown target: ${m[1] || "(none)"}`, "", `available: ${FLAVOR_IDS.join(" · ")}`]);
  }

  if (s === "targets" || s === "flavors") {
    return lines([
      ...FLAVOR_IDS.map((id) => `--target=${id} — ${FLAVORS[id]?.title}`),
      "",
      "type one to open it",
    ]);
  }

  if (s === "ls" || s === "ll" || s === "ls -la") {
    return lines([...listing(ir.graph.rootId), "", "cd <name> to open one"]);
  }

  if ((m = /^ls\s+(.+)$/.exec(s))) {
    const e = findEntity(m[1]);
    if (!e) return notFound(m[1]);
    const out = listing(e.id);
    return lines(out.length ? out : [`${e.id} is a leaf. cd ${e.id} to open it`]);
  }

  if (s === "tree") {
    const out: string[] = [];
    ir.walk((e, depth) => {
      if (depth > 1) return "skip";
      const n = ir.children(e.id).length;
      out.push(depth === 0 ? e.label : `├─ ${e.id}${n ? ` · ${n}` : ""}`);
    });
    return lines([...out, "", "the full tree: --target=ast"]);
  }

  if ((m = /^(cd|open)\s+(.+)$/.exec(s))) {
    const q = m[2].trim();
    if (q === "/" || q === "~" || q === "..") return { type: "text", content: "already at the root" };
    const e = findEntity(q);
    return e ? go(`opening ${e.label}…`, `/node/${e.id}`) : notFound(q);
  }

  if ((m = /^cat\s+(.+)$/.exec(s))) {
    const e = findEntity(m[1]);
    if (!e) return notFound(m[1]);
    return lines([`# ${e.label}`, "", e.summary, ...(e.excerpt ? ["", e.excerpt] : []), "", `→ cd ${e.id}`]);
  }

  return null;
}

export interface Completion {
  prefix: string;
  items: { name: string; hint: string }[];
}

/** Suggestions for `cd|open|ls|cat <partial>` and `--target=<partial>`. */
export function completeIR(input: string): Completion | null {
  let m = /^(--target=|target |run )(\S*)$/.exec(input);
  if (m) {
    const [, prefix, part] = m;
    if (FLAVOR_IDS.includes(part as TargetId)) return null;
    const items = FLAVOR_IDS.filter((id) => id.startsWith(part)).map((id) => ({ name: id, hint: FLAVORS[id]?.title ?? "" }));
    return items.length ? { prefix, items } : null;
  }
  m = /^((?:cd|open|ls|cat) )(.*)$/.exec(input);
  if (!m) return null;
  const [, prefix, raw] = m;
  const part = raw.toLowerCase();
  if (ir.entity(part)) return null;
  const items: Completion["items"] = [];
  ir.walk((e, depth) => {
    if (items.length >= 8) return "skip";
    if (depth === 0) return;
    // An empty partial suggests the top-level sections only.
    if (!part ? depth === 1 : e.id.startsWith(part) || e.label.toLowerCase().includes(part)) {
      items.push({ name: e.id, hint: e.label });
    }
  });
  return items.length ? { prefix, items } : null;
}
