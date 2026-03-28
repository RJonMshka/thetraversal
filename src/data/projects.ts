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
      "AI-powered resume tailoring tool that analyzes job descriptions and optimizes resumes for relevance.",
    body: "AI resume tailoring with NLP analysis and intelligent restructuring.",
    deep: null,
  },
  meta: {
    tags: ["ai", "nlp", "career-tools", "full-stack"],
    params: ["Next.js", "Python", "Claude API", "NLP"],
    links: [
      { label: "GitHub", url: "https://github.com/rajatkumar" },
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
      "A custom programming language with a tree-walking interpreter, built to understand compilation from first principles.",
    body: "Custom language with lexer, parser, AST, and tree-walking evaluator.",
    deep: null,
  },
  meta: {
    tags: ["compilers", "interpreters", "languages", "typescript"],
    params: ["TypeScript", "Lexer", "Parser", "AST"],
    links: [
      { label: "GitHub", url: "https://github.com/rajatkumar" },
    ],
  },
} satisfies ASTNode;

export const AI_COMMIT_NODE = {
  id: "ai-commit-generator",
  type: "FunctionDeclaration",
  label: "AI Commit Generator",
  slug: "ai-commit-generator",
  glowColor: "--ctp-peach",
  content: {
    summary:
      "CLI tool that reads your staged git diff and generates meaningful commit messages using AI.",
    body: "Git diff analysis with AI-powered commit message generation.",
    deep: null,
  },
  meta: {
    tags: ["developer-tools", "cli", "ai", "git"],
    params: ["Node.js", "Git", "Claude API", "CLI"],
    links: [
      { label: "GitHub", url: "https://github.com/rajatkumar" },
    ],
  },
} satisfies ASTNode;

export const CRM_NODE = {
  id: "crm-tool",
  type: "FunctionDeclaration",
  label: "CRM Tool",
  slug: "crm-tool",
  glowColor: "--ctp-peach",
  content: {
    summary:
      "Lightweight CRM application for managing client relationships with a clean, minimal interface.",
    body: "Full-stack CRM with contact management, pipeline visualization, and reporting.",
    deep: null,
  },
  meta: {
    tags: ["full-stack", "react", "node", "database"],
    params: ["React", "Node.js", "PostgreSQL", "REST"],
    links: [
      { label: "GitHub", url: "https://github.com/rajatkumar" },
    ],
  },
} satisfies ASTNode;

export const PROJECT_NODES = [
  RESUMIND_NODE,
  CLAUSE_NODE,
  AI_COMMIT_NODE,
  CRM_NODE,
] as const;
