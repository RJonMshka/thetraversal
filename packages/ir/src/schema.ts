import { z } from "zod";

// ── IR schema (LLD-01 §3) ──────────────────────────────────────────────
// The domain-typed entity graph every target reads. AST vocabulary does
// not appear here; the AST is one projection of it (LLD-01 §7).

export const IR_SCHEMA_VERSION = "1.0.0";

export const Kind = z.enum([
  "root", // Rajat Kumar
  "identity", // who I am
  "resume",
  "education", // container
  "degree",
  "section", // generic grouping: projects, research, skills
  "project",
  "paper", // Rewiring the Interface
  "essays", // philosophy container
  "essay",
  "skill-cluster",
  "skill",
  "timeline",
  "roles", // ordered container of roles
  "role",
  "connect",
  "channel", // github, linkedin, email
]);
export type Kind = z.infer<typeof Kind>;

// Absolute http(s), mailto, or a root-relative path served by the shell
// (the resume downloads live under /resume/).
const LinkUrl = z
  .string()
  .regex(/^(https?:\/\/\S+|mailto:\S+|\/\S*)$/, "expected http(s)://, mailto:, or /path");

export const Link = z.object({ label: z.string(), url: LinkUrl });
export type Link = z.infer<typeof Link>;

export const EntityId = z.string().regex(/^[a-z0-9-]+$/);

export const Entity = z.object({
  id: EntityId, // stable, kebab-case, doubles as slug
  kind: Kind,
  label: z.string().min(1),
  summary: z.string().default(""),
  excerpt: z.string().optional(), // short plain-text prose, paragraphs split by "\n\n"
  tags: z.array(z.string()).default([]),
  stack: z.array(z.string()).default([]), // was meta.params
  links: z.array(Link).default([]),
  date: z.string().optional(), // ISO or "2023-07 / present"
  status: z.enum(["published", "draft"]).default("published"),
  hasBody: z.boolean(), // body/<id>.json exists
  essayRef: z.string().optional(), // was content.deep; body id is essayBodyId(essayRef)
});
export type Entity = z.infer<typeof Entity>;

export const Rel = z.enum(["contains", "implements", "extends", "cites", "uses"]);
export type Rel = z.infer<typeof Rel>;

export const Edge = z.object({
  from: z.string(),
  to: z.string(),
  rel: Rel,
  order: z.number().int().optional(), // sibling order for "contains"
});
export type Edge = z.infer<typeof Edge>;

export const Graph = z.object({
  schemaVersion: z.literal(IR_SCHEMA_VERSION),
  contentHash: z.string(), // sha256 of canonical JSON, first 12 chars
  builtAt: z.string(),
  rootId: z.string(),
  entities: z.record(z.string(), Entity),
  edges: z.array(Edge),
});
export type Graph = z.infer<typeof Graph>;

export const Body = z.object({
  id: z.string(), // entity id, or essayBodyId(ref) for essays
  html: z.string(), // sanitized, shiki-highlighted
  toc: z.array(z.object({ id: z.string(), text: z.string(), depth: z.number() })),
  readingMinutes: z.number(),
});
export type Body = z.infer<typeof Body>;

export const IRIndex = z.object({
  schemaVersion: z.literal(IR_SCHEMA_VERSION),
  contentHash: z.string(),
  graph: z.string(),
  bodies: z.record(z.string(), z.string()),
});
export type IRIndex = z.infer<typeof IRIndex>;

/**
 * Body id of a long-form essay. Node prose and essays live in separate
 * MDX sets and may share a name, so essay bodies are namespaced. Entity
 * ids cannot contain ".", so the two never collide.
 */
export function essayBodyId(ref: string): string {
  return `essay.${ref}`;
}

// ── Source (registry) shape ────────────────────────────────────────────
// What content/registry/*.ts authors. `hasBody` is derived by the
// compiler from content/mdx/nodes; `children` becomes ordered `contains`
// edges (draft children are dropped).

export const SourceEntity = Entity.omit({ hasBody: true }).extend({
  children: z.array(EntityId).default([]),
});
export type SourceEntity = z.input<typeof SourceEntity>;

export const SourceRelation = z.object({
  from: EntityId,
  to: EntityId,
  rel: Rel.exclude(["contains", "uses"]),
});
export type SourceRelation = z.infer<typeof SourceRelation>;
