import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import {
  Edge,
  Entity,
  Graph,
  IR_SCHEMA_VERSION,
  SourceEntity,
  SourceRelation,
  essayBodyId,
  type Body,
} from "../schema";
import { compileBody, splitFrontmatter } from "./mdx";

// ── Compiler pipeline (LLD-01 §4) ──────────────────────────────────────
// load ─▶ validate ─▶ drop drafts ─▶ contains edges ─▶ relations
//      ─▶ uses edges ─▶ integrity ─▶ compile MDX ─▶ hash
// Pure: file IO lives in ./io.ts so this can be tested with fixtures.

export const GRAPH_BUDGET_KB_GZ = 60;

export interface Registry {
  rootId: string;
  entities: readonly unknown[];
  relations: readonly unknown[];
  /** stack item (lowercase) → skill label, for derived `uses` edges. */
  stackAliases: Readonly<Record<string, string>>;
}

export interface MdxSources {
  /** content/mdx/nodes/<id>.mdx, raw text keyed by file stem. */
  nodes: ReadonlyMap<string, string>;
  /** content/mdx/essays/<ref>.mdx, raw text keyed by file stem. */
  essays: ReadonlyMap<string, string>;
}

export interface CompileResult {
  graph: Graph;
  bodies: Body[];
  warnings: string[];
}

export class IRBuildError extends Error {
  constructor(public readonly problems: string[]) {
    super(`IR build failed:\n  - ${problems.join("\n  - ")}`);
  }
}

/** Sorted-key JSON, so the hash depends only on content. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v
  );
}

export function shortHash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

export async function compileIR(
  registry: Registry,
  mdx: MdxSources,
  opts: { builtAt?: string; budgetKbGz?: number } = {}
): Promise<CompileResult> {
  const problems: string[] = [];
  const warnings: string[] = [];

  // ── validate ─────────────────────────────────────────────────────────
  const sources: SourceEntity[] = [];
  registry.entities.forEach((raw, i) => {
    const parsed = SourceEntity.safeParse(raw);
    if (parsed.success) sources.push(parsed.data);
    else problems.push(`entity #${i}: ${parsed.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`);
  });
  const relations: SourceRelation[] = [];
  registry.relations.forEach((raw, i) => {
    const parsed = SourceRelation.safeParse(raw);
    if (parsed.success) relations.push(parsed.data);
    else problems.push(`relation #${i}: ${parsed.error.message}`);
  });

  // 1. unique ids (across drafts too: a draft still owns its id)
  const sourceById = new Map<string, SourceEntity>();
  for (const s of sources) {
    if (sourceById.has(s.id)) problems.push(`duplicate id "${s.id}"`);
    sourceById.set(s.id, s);
  }
  if (problems.length) throw new IRBuildError(problems);

  // ── drop drafts ──────────────────────────────────────────────────────
  const published = new Map(
    [...sourceById].filter(([, s]) => (s.status ?? "published") === "published")
  );
  const isDraft = (id: string) => sourceById.has(id) && !published.has(id);

  // ── contains edges ───────────────────────────────────────────────────
  const edges: Edge[] = [];
  for (const parent of published.values()) {
    let order = 0;
    for (const child of parent.children ?? []) {
      if (isDraft(child)) continue;
      if (!published.has(child)) {
        problems.push(`"${parent.id}" contains unknown id "${child}"`);
        continue;
      }
      edges.push({ from: parent.id, to: child, rel: "contains", order: order++ });
    }
  }

  // ── relations ────────────────────────────────────────────────────────
  for (const r of relations) {
    const missing = [r.from, r.to].filter((id) => !sourceById.has(id));
    if (missing.length) {
      problems.push(`relation ${r.from} ${r.rel} ${r.to}: unknown id ${missing.join(", ")}`);
      continue;
    }
    const drafts = [r.from, r.to].filter(isDraft);
    if (drafts.length) {
      warnings.push(`relation ${r.from} ${r.rel} ${r.to} dropped: ${drafts.join(", ")} is a draft`);
      continue;
    }
    edges.push({ from: r.from, to: r.to, rel: r.rel });
  }

  // ── derived uses edges ───────────────────────────────────────────────
  const skillsByLabel = new Map<string, string[]>();
  for (const s of published.values()) {
    if (s.kind !== "skill") continue;
    const key = s.label.toLowerCase();
    skillsByLabel.set(key, [...(skillsByLabel.get(key) ?? []), s.id]);
  }
  for (const s of published.values()) {
    if (s.kind !== "project") continue;
    const targets = new Set<string>();
    for (const item of s.stack ?? []) {
      const label = (registry.stackAliases[item.toLowerCase()] ?? item).toLowerCase();
      for (const id of skillsByLabel.get(label) ?? []) targets.add(id);
    }
    for (const to of targets) edges.push({ from: s.id, to, rel: "uses" });
  }

  // ── entities (hasBody from node MDX) ─────────────────────────────────
  const entities: Record<string, Entity> = {};
  for (const s of published.values()) {
    const { children: _children, ...rest } = s;
    entities[s.id] = Entity.parse({ ...rest, hasBody: mdx.nodes.has(s.id) });
  }

  // ── integrity ────────────────────────────────────────────────────────
  // 2. every edge endpoint exists
  for (const e of edges) {
    if (!entities[e.from] || !entities[e.to]) problems.push(`edge ${e.from} ${e.rel} ${e.to} has a missing endpoint`);
  }
  // 3. contains is a tree rooted at rootId
  if (!entities[registry.rootId]) problems.push(`root "${registry.rootId}" is missing or a draft`);
  const parentOf = new Map<string, string>();
  for (const e of edges) {
    if (e.rel !== "contains") continue;
    const prev = parentOf.get(e.to);
    if (prev) problems.push(`"${e.to}" has two parents: "${prev}" and "${e.from}"`);
    parentOf.set(e.to, e.from);
  }
  if (parentOf.has(registry.rootId)) problems.push(`root "${registry.rootId}" has a parent`);
  const childrenOf = new Map<string, string[]>();
  for (const [child, parent] of parentOf) childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), child]);
  const reached = new Set<string>();
  const stack = [registry.rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (reached.has(id)) {
      problems.push(`cycle through "${id}"`);
      continue;
    }
    reached.add(id);
    stack.push(...(childrenOf.get(id) ?? []));
  }
  for (const id of Object.keys(entities)) {
    if (!reached.has(id)) problems.push(`"${id}" is not reachable from root`);
  }
  // 4. essayRef resolves to an essay MDX file
  for (const e of Object.values(entities)) {
    if (e.essayRef !== undefined && !mdx.essays.has(e.essayRef)) {
      problems.push(`"${e.id}" essayRef "${e.essayRef}" has no content/mdx/essays/${e.essayRef}.mdx`);
    }
  }
  // 5. every MDX file maps to an entity (orphans warn)
  for (const stem of mdx.nodes.keys()) {
    if (!entities[stem]) warnings.push(`content/mdx/nodes/${stem}.mdx has no published entity (skipped)`);
  }
  const refs = new Set(Object.values(entities).map((e) => e.essayRef));
  for (const stem of mdx.essays.keys()) {
    if (!refs.has(stem)) warnings.push(`content/mdx/essays/${stem}.mdx is not referenced by any essayRef (skipped)`);
  }
  if (problems.length) throw new IRBuildError(problems);

  // ── compile MDX bodies ───────────────────────────────────────────────
  const bodies: Body[] = [];
  for (const e of Object.values(entities)) {
    if (e.hasBody) {
      const { data, content } = splitFrontmatter(mdx.nodes.get(e.id)!);
      if (data.summary !== undefined && data.summary !== e.summary) {
        warnings.push(`nodes/${e.id}.mdx frontmatter summary differs from the registry (registry wins)`);
      }
      if (data.deep !== undefined && data.deep !== e.essayRef) {
        warnings.push(`nodes/${e.id}.mdx frontmatter deep differs from essayRef (registry wins)`);
      }
      bodies.push(await compileBody(e.id, content.trim()));
    }
    if (e.essayRef !== undefined) {
      const raw = mdx.essays.get(e.essayRef)!;
      const { content } = splitFrontmatter(raw);
      bodies.push(await compileBody(essayBodyId(e.essayRef), content, raw));
    }
  }
  // 5. every hasBody has a compiled body
  const bodyIds = new Set(bodies.map((b) => b.id));
  for (const e of Object.values(entities)) {
    if (e.hasBody && !bodyIds.has(e.id)) problems.push(`"${e.id}" hasBody but no body compiled`);
  }

  // ── hash ─────────────────────────────────────────────────────────────
  const sortedEntities = Object.fromEntries(Object.entries(entities).sort(([a], [b]) => (a < b ? -1 : 1)));
  const contentHash = shortHash(canonicalJson({ entities: sortedEntities, edges, bodies }));
  const graph = Graph.parse({
    schemaVersion: IR_SCHEMA_VERSION,
    contentHash,
    builtAt: opts.builtAt ?? new Date().toISOString(),
    rootId: registry.rootId,
    entities,
    edges,
  });

  // 6. graph size budget
  const budget = opts.budgetKbGz ?? GRAPH_BUDGET_KB_GZ;
  const gzKb = gzipSync(JSON.stringify(graph)).length / 1024;
  if (gzKb > budget) {
    const largest = Object.values(entities)
      .map((e) => ({ id: e.id, bytes: JSON.stringify(e).length }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 10)
      .map((x) => `${x.id} (${x.bytes} B)`);
    problems.push(`graph is ${gzKb.toFixed(1)} KB gzipped, budget ${budget} KB. Largest: ${largest.join(", ")}`);
  }
  if (problems.length) throw new IRBuildError(problems);

  return { graph, bodies, warnings };
}
