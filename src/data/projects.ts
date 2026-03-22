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
    body: `RESUMIND parses job descriptions using NLP, extracts key requirements, and restructures your resume to maximize alignment. It doesn't fabricate — it reorganizes and emphasizes what's already true about you.

Built with a Next.js frontend and Python backend, it uses Claude's API for intelligent content restructuring. The architecture separates analysis (what does this job need?) from generation (how do I present what I have?) — a compiler pipeline applied to career documents.

Key decisions: chose streaming responses for real-time feedback, implemented diff-view so users see exactly what changed, and built a scoring heuristic that estimates ATS compatibility.`,
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
    body: `Clause is a dynamically-typed language with first-class functions, closures, and a clean syntax inspired by the intersection of JavaScript and Python. Built following Thorsten Ball's "Writing an Interpreter in Go" — but reimplemented in TypeScript to deeply internalize every stage.

The pipeline: Lexer → Parser → AST → Evaluator. Each stage is a self-contained module. The parser produces a real AST (the same concept powering this portfolio). The evaluator walks the tree, maintaining environments for scope and closures.

This project changed how I think about software. Every program is a tree. Every feature is a transformation. This portfolio is the logical conclusion of that realization.`,
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
    body: `A developer tool that solves the "what do I write for this commit?" problem. It reads the staged diff, analyzes the semantic intent of the changes, and produces a conventional commit message.

Supports multiple AI providers, respects .gitignore patterns for context, and can be configured with custom commit conventions. Integrates as a git hook or standalone CLI.

The interesting engineering challenge: diffs are noisy. The tool uses a preprocessing step to filter out formatting changes, lock file updates, and auto-generated code before sending to the model. This dramatically improves output quality.`,
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
    body: `A full-stack CRM designed for small teams and freelancers who don't need Salesforce but need more than a spreadsheet. Features contact management, interaction tracking, pipeline visualization, and basic reporting.

Built with a React frontend and Node.js backend. The data model is intentionally simple — contacts, interactions, and deals — because most CRM complexity is accidental, not essential.

Focused on the user experience: fast search, keyboard shortcuts, and a timeline view that shows the full history of any relationship at a glance.`,
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
