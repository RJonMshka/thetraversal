import type { IRClient } from "@tv/ir/client";

// ── Model ──────────────────────────────────────────────────────────────
// What the page builds, read from the IR: the hero (name, summary, the
// current role), the top-level sections as links, an identity card for
// the box model, and the frontend skills as flex items. Pure: unit tested
// against the real IR.

export interface Ref {
  id: string;
  label: string;
}

export interface Project extends Ref {
  summary: string;
  stack: string[];
}

/** The project the grid pins to row 1: the site itself, so the page features where you are. */
export const FEATURED = "thetraversal";

export interface BuildModel {
  root: string;
  name: string;
  summary: string;
  /** The root's `headline` when set; otherwise the current role ("Capital One · Jul 2023 – Present"), or "". */
  now: string;
  sections: Ref[];
  card: { id: string; title: string; text: string };
  flex: { id: string; label: string; items: Ref[] };
  /** Projects as grid items; `featured` is this site when it is published. */
  grid: { id: string; label: string; items: Project[]; featured: string | null };
  /** The IR the page is compiled from: totals and the top level, with subtree sizes. */
  source: { schema: string; entities: number; edges: number; sections: (Ref & { kind: string; size: number })[] };
  /** Parent per entity, for stepping focus out. */
  parent(id: string): string | null;
  has(id: string): boolean;
}

/** First paragraph, cut to whole sentences within `max` characters. */
export function lede(text: string, max = 220): string {
  const para = (text.split("\n\n")[0] ?? "").trim();
  if (para.length <= max) return para;
  const sentences = para.match(/[^.!?]+[.!?]+/g) ?? [para];
  let out = "";
  for (const s of sentences) {
    if ((out + s).trim().length > max) break;
    out += s;
  }
  if (out.trim()) return out.trim();
  // One long sentence: cut at the last word that fits.
  const cut = para.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : cut.length).replace(/[,:;\s]+$/, "")}…`;
}

const SKIP_SECTIONS = new Set(["identity"]);

export function buildModel(ir: IRClient): BuildModel {
  const root = ir.entity(ir.graph.rootId);
  if (!root) throw new Error("IR has no root entity");

  const roles = ir.byKind("role").filter((r) => /present/i.test(r.date ?? ""));
  const current = roles.at(-1) ?? ir.byKind("role").at(-1);

  const identity = ir.entity("identity");
  const frontend = ir.entity("skills-frontend") ?? ir.byKind("skill-cluster")[0];

  return {
    root: root.id,
    name: root.label,
    summary: root.summary,
    now: root.headline?.trim() || (current ? [current.label, current.date].filter(Boolean).join(" · ") : ""),
    sections: ir
      .children(root.id)
      .filter((e) => !SKIP_SECTIONS.has(e.id))
      .map((e) => ({ id: e.id, label: e.label.toLowerCase() })),
    card: identity
      ? { id: identity.id, title: identity.summary || identity.label, text: lede(identity.excerpt ?? identity.summary) }
      : { id: root.id, title: root.label, text: root.summary },
    flex: frontend
      ? { id: frontend.id, label: frontend.label, items: ir.children(frontend.id).map((e) => ({ id: e.id, label: e.label })) }
      : { id: root.id, label: root.label, items: [] },
    grid: (() => {
      const items = ir.children("projects").map((e) => ({ id: e.id, label: e.label, summary: lede(e.summary, 90), stack: e.stack.slice(0, 3) }));
      const featured = items.find((p) => p.id === FEATURED)?.id ?? items.at(-1)?.id ?? null;
      return { id: "projects", label: ir.entity("projects")?.label ?? "Projects", items, featured };
    })(),
    source: (() => {
      const subtree = (id: string): number => ir.children(id).reduce((n, c) => n + 1 + subtree(c.id), 0);
      return {
        schema: ir.version.schema,
        entities: Object.keys(ir.graph.entities).length,
        edges: ir.graph.edges.length,
        sections: ir.children(root.id).map((e) => ({ id: e.id, label: e.label, kind: e.kind, size: subtree(e.id) })),
      };
    })(),
    parent: (id) => ir.parent(id)?.id ?? null,
    has: (id) => ir.entity(id) !== undefined,
  };
}
