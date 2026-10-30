import type { Entity, IRClient, Kind } from "@tv/ir";
import type { ASTNode, ASTNodeMeta, ASTNodeType } from "@/targets/ast/lib/ast-types";

// ── AST projection (LLD-01 §7) ─────────────────────────────────────────
// The IR is domain-typed; the AST is one way to look at it. Every table
// is a Record<Kind, …>, so adding a Kind without deciding its AST shape
// fails type-check. Moves into the ast target in Phase 3.

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

// Glow token per kind. A section has no color of its own: it takes the
// glow of what it groups (projects glow like projects, research like
// papers, skills like skill clusters).
const GLOW: Record<Kind, string | "inherit-children"> = {
  root: "--ctp-text",
  identity: "--ctp-yellow",
  resume: "--ctp-yellow",
  education: "--ctp-yellow",
  degree: "--ctp-yellow",
  section: "inherit-children",
  project: "--ctp-peach",
  paper: "--ctp-blue",
  essays: "--ctp-lavender",
  essay: "--ctp-lavender",
  "skill-cluster": "--ctp-mauve",
  skill: "--ctp-mauve",
  timeline: "--ctp-teal",
  roles: "--ctp-teal",
  role: "--ctp-teal",
  connect: "--ctp-green",
  channel: "--ctp-green",
};

const FALLBACK_GLOW = "--ctp-text";

// Kinds whose AST content always carries `deep` (null when there is no
// long-form essay), so the inspector can show "no deep content".
const DEEP_ALWAYS: Record<Kind, boolean> = {
  root: false,
  identity: false,
  resume: false,
  education: false,
  degree: false,
  section: false,
  project: true,
  paper: false,
  essays: false,
  essay: false,
  "skill-cluster": false,
  skill: false,
  timeline: false,
  roles: false,
  role: false,
  connect: false,
  channel: false,
};

// Kinds that keep an empty tag list: roles are tagged "current" or not,
// and the timeline reads the list either way.
const TAGS_ALWAYS: Record<Kind, boolean> = {
  root: false,
  identity: false,
  resume: false,
  education: false,
  degree: false,
  section: false,
  project: false,
  paper: false,
  essays: false,
  essay: false,
  "skill-cluster": false,
  skill: false,
  timeline: false,
  roles: false,
  role: true,
  connect: false,
  channel: false,
};

function glowOf(ir: IRClient, entity: Entity): string {
  const glow = GLOW[entity.kind];
  if (glow !== "inherit-children") return glow;
  const first = ir.children(entity.id)[0];
  return first ? glowOf(ir, first) : FALLBACK_GLOW;
}

function metaOf(entity: Entity): ASTNodeMeta | undefined {
  const meta: ASTNodeMeta = {};
  if (entity.tags.length > 0 || TAGS_ALWAYS[entity.kind]) meta.tags = entity.tags;
  if (entity.date !== undefined) meta.date = entity.date;
  if (entity.links.length > 0) meta.links = entity.links;
  if (entity.stack.length > 0) meta.params = entity.stack;
  return Object.keys(meta).length > 0 ? meta : undefined;
}

function project(ir: IRClient, entity: Entity): ASTNode {
  const node: ASTNode = {
    id: entity.id,
    type: AST_TYPE[entity.kind],
    label: entity.label,
    slug: entity.id,
    glowColor: glowOf(ir, entity),
    content: {
      summary: entity.summary,
      body: entity.excerpt ?? "",
      ...(entity.essayRef !== undefined
        ? { deep: entity.essayRef }
        : DEEP_ALWAYS[entity.kind]
          ? { deep: null }
          : {}),
    },
  };
  const children = ir.children(entity.id);
  if (children.length > 0) node.children = children.map((child) => project(ir, child));
  const meta = metaOf(entity);
  if (meta) node.meta = meta;
  return node;
}

/** Projects the IR's contains tree into the portfolio AST. */
export function toAST(ir: IRClient): ASTNode {
  const root = ir.entity(ir.graph.rootId);
  if (!root) throw new Error(`IR root "${ir.graph.rootId}" is missing`);
  return project(ir, root);
}
