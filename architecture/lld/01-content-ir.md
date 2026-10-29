# LLD-01: Content IR

Package: `packages/ir` (`@tv/ir`). Source: `content/`. Consumers: shell (build time and runtime), every target (through `ctx.ir`).

## 1. Problem with the current model

Today the data layer is `src/data/*.ts`, where every entry is already an `ASTNode`:

- `type: ASTNodeType` is doing the job of a domain kind, and it collapses distinctions. `ImportDeclaration` is both resume and education. `StringLiteral` is skills, timeline roles, degrees, and contact channels. `CallExpression` is both the research paper and the essays.
- `glowColor` is presentation stored in data.
- Prose lives in two places: inline fallbacks in TS and canonical text in `src/content/nodes/*.mdx`, merged at request time by `enrichNodeContent` in `app/node/[slug]/page.tsx`.

The good news: `src/data/index.ts` is already a facade, and 13 modules consume data only through `@/data`. That facade is the migration seam.

## 2. Source layout after migration

```
content/
  registry/
    identity.ts       # root + identity + connect channels
    projects.ts       # PROJECT_REGISTRY, publish flags preserved
    research.ts
    essays.ts         # was philosophy.ts
    skills.ts
    timeline.ts
    education.ts
    resume.ts
    relations.ts      # cross-links that are not tree edges
  mdx/
    nodes/*.mdx       # moved from src/content/nodes
    essays/*.mdx      # moved from src/content/*.mdx
```

Registries are plain TS exporting domain-typed objects validated by the schema. Nothing in `content/` imports from `@tv/ir` except types.

## 3. Schema

```ts
// packages/ir/src/schema.ts
import { z } from "zod";

export const IR_SCHEMA_VERSION = "1.0.0";

export const Kind = z.enum([
  "root",          // Rajat Kumar
  "identity",      // who I am
  "resume",
  "education",     // container
  "degree",
  "section",       // generic grouping: projects, research, skills
  "project",
  "paper",         // Rewiring the Interface
  "essays",        // philosophy container
  "essay",
  "skill-cluster",
  "skill",
  "timeline",
  "roles",         // ordered container of roles
  "role",
  "connect",
  "channel",       // github, linkedin, email
]);
export type Kind = z.infer<typeof Kind>;

export const Link = z.object({ label: z.string(), url: z.string().url() });

export const Entity = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),   // stable, kebab-case, doubles as slug
  kind: Kind,
  label: z.string().min(1),
  summary: z.string().default(""),
  tags: z.array(z.string()).default([]),
  stack: z.array(z.string()).default([]), // was meta.params
  links: z.array(Link).default([]),
  date: z.string().optional(),            // ISO or "2023-07 / present"
  status: z.enum(["published", "draft"]).default("published"),
  hasBody: z.boolean(),                    // body/<id>.json exists
  essayRef: z.string().optional(),         // was content.deep
});
export type Entity = z.infer<typeof Entity>;

export const Rel = z.enum(["contains", "implements", "extends", "cites", "uses"]);

export const Edge = z.object({
  from: z.string(),
  to: z.string(),
  rel: Rel,
  order: z.number().int().optional(),      // sibling order for "contains"
});

export const Graph = z.object({
  schemaVersion: z.literal(IR_SCHEMA_VERSION),
  contentHash: z.string(),                 // sha256 of canonical JSON, first 12 chars
  builtAt: z.string(),
  rootId: z.string(),
  entities: z.record(z.string(), Entity),
  edges: z.array(Edge),
});
export type Graph = z.infer<typeof Graph>;

export const Body = z.object({
  id: z.string(),
  html: z.string(),                        // sanitized, shiki-highlighted
  toc: z.array(z.object({ id: z.string(), text: z.string(), depth: z.number() })),
  readingMinutes: z.number(),
});
export type Body = z.infer<typeof Body>;
```

Notes:
- `id` and slug are the same thing. Current data has both, always equal; the compiler asserts this during migration.
- `status: "draft"` entities are excluded from the emitted graph. The registry keeps them, matching the existing publication policy ("nothing is ever deleted, only unpublished").
- `contains` edges form a tree rooted at `rootId`. Other relations form the cross-link graph the 3D target uses (for example the thesis triangle: `kata implements rewiring-the-interface`, `mfkit implements rewiring-the-interface`).
- `uses` edges are derived: each `project.stack` item that matches a `skill.label` (case-insensitive, alias table in `relations.ts`) yields `project uses skill`. This gives the 3D and metrics targets real structure without hand-authoring.

## 4. Compiler pipeline

```
load registries ─▶ validate (zod) ─▶ drop drafts ─▶ build contains edges
     ─▶ merge relations.ts ─▶ derive uses edges ─▶ integrity checks
     ─▶ compile MDX bodies ─▶ hash ─▶ emit
```

Integrity checks (build fails on any):
1. Unique ids.
2. Every edge endpoint exists after draft removal (a relation to a draft is dropped with a warning, not an error).
3. `contains` is a tree: one parent per entity, no cycles, everything reachable from root.
4. `essayRef` resolves to an MDX file.
5. Every `hasBody: true` has a compiled body; every MDX file maps to an entity (orphans warn).
6. Graph JSON gzipped size under budget (60 KB), else fail with the top 10 largest entities listed.

MDX compilation uses the stack already in the repo (`remark-gfm`, `rehype-pretty-code`, `shiki`) via `@mdx-js/mdx` `compile` to HTML, then `rehype-sanitize` with an allowlist that keeps shiki spans and heading ids. Element styling moves from `mdx-components.tsx` into `packages/tokens/prose.css` under a `.tv-prose` class, using the same token variables.

## 5. Outputs

Written to `apps/shell/public/ir/v1/` by `pnpm --filter @tv/ir build`:

```
graph.json                 # Cache-Control: max-age=60, stale-while-revalidate=600
graph.<hash>.json          # immutable
body/<id>.<hash>.json      # immutable
index.json                 # { schemaVersion, contentHash, graph: "graph.<hash>.json", bodies: { id: "body/<id>.<hash>.json" } }
```

The shell also imports the graph at build time (`import graph from "@tv/ir/dist/graph.json"`) so SSR and first paint never wait on a fetch. Hashed files exist for targets loaded later and for long-lived tabs.

## 6. IRClient (what targets receive)

```ts
// packages/ir/src/client.ts
export interface IRClient {
  readonly graph: Graph;
  readonly version: { schema: string; content: string };
  entity(id: string): Entity | undefined;
  children(id: string): Entity[];            // ordered contains children
  parent(id: string): Entity | undefined;
  path(id: string): Entity[];                 // root → id
  related(id: string, rel?: Rel): { entity: Entity; rel: Rel; dir: "out" | "in" }[];
  byKind(kind: Kind): Entity[];
  walk(visit: (e: Entity, depth: number) => void | "skip"): void; // DFS in contains order
  body(id: string, signal?: AbortSignal): Promise<Body | null>;   // cached, deduped
}

export function createIRClient(graph: Graph, opts: { bodyUrl: (id: string) => string }): IRClient;
```

Index structures (`childrenOf`, `parentOf`, adjacency for relations) are built once in `createIRClient`. `body()` keeps an in-memory map of in-flight promises so two targets asking for the same body share one request.

Targets never construct IR URLs. If the IR location changes, only the shell changes.

## 7. AST projection (owned by the `ast` target)

```ts
// targets/ast/src/projection.ts  (in Phase 2 lives at apps/shell/src/data/projection.ts)
const AST_TYPE: Record<Kind, ASTNodeType> = {
  root: "RootNode",
  identity: "ProgramNode",
  resume: "ImportDeclaration",
  education: "ImportDeclaration",
  degree: "StringLiteral",
  section: "BlockStatement",
  project: "FunctionDeclaration",
  paper: "CallExpression",
  essays: "ExpressionStatement",
  essay: "CallExpression",
  "skill-cluster": "ObjectExpression",
  skill: "StringLiteral",
  timeline: "VariableDeclaration",
  roles: "ArrayExpression",
  role: "StringLiteral",
  connect: "ExportDeclaration",
  channel: "StringLiteral",
};

const GLOW: Record<Kind, string> = { /* kind → token name, e.g. project: "--ctp-peach" */ };

export function toAST(ir: IRClient): ASTNode { /* walk contains edges, map fields */ }
```

`Record<Kind, …>` makes the mapping exhaustive at compile time: adding a kind without deciding its AST shape fails `tsc`.

## 8. Golden test (the migration safety net)

Before the old `src/data` registries are deleted:

```ts
// apps/shell/src/__tests__/ir-parity.test.ts
import { PORTFOLIO_AST as LEGACY } from "@/data/legacy/ast";
import { toAST } from "@/data/projection";
import { createIRClient } from "@tv/ir";
import graph from "@tv/ir/dist/graph.json";

it("IR projected to AST equals the legacy tree", () => {
  const projected = toAST(createIRClient(graph, { bodyUrl: () => "" }));
  expect(stripInlineBodies(projected)).toEqual(stripInlineBodies(LEGACY));
});
```

`stripInlineBodies` removes `content.body` (bodies moved to the body store). Any glow or type mismatch shows up here as a precise diff. Resolve each by fixing the projection table, not by special-casing ids. If a mismatch is genuinely per-entity (for example one project deliberately glows differently), add a semantic `accent` field to `Entity` rather than a hex or token name.

## 9. Versioning

- `IR_SCHEMA_VERSION` follows semver. Adding an optional field or a new `Kind` is minor. Removing or renaming is major and requires a new `/ir/v2/` output path served alongside v1 until every target declares `ir: ">=2"`.
- Adding a new `Kind` is minor for the schema but forces every target with an exhaustive map to handle it. That is intended.

## 10. Content workflow (for Claude Code)

1. Editorial changes arrive in `docs/CONTENT-v2.md` (local, gitignored) or directly from Rajat.
2. Apply them to `content/registry/*.ts` or `content/mdx/**`.
3. `pnpm --filter @tv/ir build` must pass integrity checks.
4. Publishing a project is still a one-line flag flip (`status: "published"`).
