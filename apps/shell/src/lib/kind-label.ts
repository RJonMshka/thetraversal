import type { Kind } from "@tv/ir";

// ── Kind labels for node pages ─────────────────────────────────────────
// Node pages tag each entity with its role in the portfolio-as-program
// ("FunctionDeclaration" for a project). This is the page's own voice,
// keyed by kind; the AST target has its own projection.

export const KIND_TAG: Record<Kind, string> = {
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

/** The keyword a generic node page opens with (`block`, `literal`, ...). */
export const KIND_KEYWORD: Record<Kind, string> = {
  root: "root",
  identity: "programnode",
  resume: "import",
  education: "import",
  degree: "literal",
  section: "block",
  project: "functiondeclaration",
  paper: "callexpression",
  essays: "expression",
  essay: "callexpression",
  "skill-cluster": "objectexpression",
  skill: "literal",
  timeline: "const",
  roles: "array",
  role: "literal",
  connect: "exportdeclaration",
  channel: "literal",
};
