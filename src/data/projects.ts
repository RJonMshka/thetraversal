import type { ASTNode } from "@/lib/ast-types";

// ── Project nodes ──────────────────────────────────────────────────────
// Each project is a FunctionDeclaration — a callable unit of work.
// params = tech stack, content = description at each traversal depth.

export const RESUMIND_NODE = {
  id: "resumind",
  type: "FunctionDeclaration",
  label: "RESUMIND",
  slug: "resumind",
  glowColor: "--ctp-peach",
  content: {
    summary:
      "AI-powered resume optimizer. Takes a resume and a target job description; produces structured, actionable suggestions via LLM output pipelines and MCP servers.",
    body: "Next.js + TypeScript + Claude API + MCP. Structured output pipelines for resume analysis.",
    deep: null,
  },
  meta: {
    tags: ["ai", "llm", "mcp", "career-tools", "full-stack"],
    params: ["Next.js", "TypeScript", "Claude API", "MCP"],
    links: [
      { label: "GitHub", url: "https://github.com/RJonMshka" },
    ],
  },
} satisfies ASTNode;

export const CLAUSE_NODE = {
  id: "clause",
  type: "FunctionDeclaration",
  label: "Clause",
  slug: "clause",
  glowColor: "--ctp-peach",
  content: {
    summary:
      "An English-like programming language that compiles to JavaScript. Built from scratch: lexer, parser, IR, runtime libraries, code generation.",
    body: "Go → JavaScript compiler. Lexer, parser, IR, runtime, code generation — all from scratch.",
    deep: null,
  },
  meta: {
    tags: ["compilers", "languages", "go", "javascript"],
    params: ["Go", "JavaScript", "Lexer", "Parser", "AST", "Code Generation"],
    links: [
      { label: "GitHub", url: "https://github.com/RJonMshka" },
    ],
  },
} satisfies ASTNode;

export const AI_COMMIT_NODE = {
  id: "ai-commit-generator",
  type: "FunctionDeclaration",
  label: "dev-session",
  slug: "ai-commit-generator",
  glowColor: "--ctp-peach",
  content: {
    summary:
      "Self-managing context architecture for AI-assisted coding. Solves how to give an AI coding agent the right context at the right time without flooding the context window.",
    body: "TypeScript npm package. Selective file-layer loading via JSDoc-style annotations for AI context management.",
    deep: null,
  },
  meta: {
    tags: ["developer-tools", "ai", "context-engineering", "typescript"],
    params: ["TypeScript", "npm", "AI Agents", "Context Engineering"],
    links: [
      { label: "GitHub", url: "https://github.com/RJonMshka" },
    ],
  },
} satisfies ASTNode;

export const CRM_NODE = {
  id: "crm-tool",
  type: "FunctionDeclaration",
  label: "AI-Powered CRM",
  slug: "crm-tool",
  glowColor: "--ctp-peach",
  content: {
    summary:
      "Full-stack CRM with AI-powered task generation using LLMs and MCP. Automated workflow creation and seamless sync between AI-driven and manual operations.",
    body: "Next.js + GraphQL + PostgreSQL + Claude API + MCP. AI-native CRM with automated workflow generation.",
    deep: null,
  },
  meta: {
    tags: ["full-stack", "ai", "mcp", "graphql", "crm"],
    params: ["Next.js", "TypeScript", "GraphQL", "PostgreSQL", "Bun", "Claude API", "MCP"],
    links: [
      { label: "GitHub", url: "https://github.com/RJonMshka" },
    ],
  },
} satisfies ASTNode;

export const PROJECT_NODES = [
  RESUMIND_NODE,
  CLAUSE_NODE,
  AI_COMMIT_NODE,
  CRM_NODE,
] as const;
