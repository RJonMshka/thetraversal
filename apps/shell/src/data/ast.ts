import type { ASTNode } from "@/lib/ast-types";
import { PROJECT_NODES } from "@/data/projects";
import { SKILL_NODES } from "@/data/skills";
import { RESEARCH_NODE } from "@/data/research";
import { TIMELINE_NODE } from "@/data/timeline";
import { RESUME_NODE } from "@/data/resume";
import { EDUCATION_NODE } from "@/data/education";
import {
  CODE_AS_CONSCIOUSNESS_NODE,
  WHY_I_BUILD_LANGUAGES_NODE,
  ON_AI_CONSCIOUSNESS_NODE,
} from "@/data/philosophy";

// ── The Master AST ─────────────────────────────────────────────────────
// The complete portfolio tree. Every node is discoverable, traversable,
// and directly linkable via /node/[slug].
//
// Content source of truth: docs/CONTENT-v2.md. Projects and skills are
// generated from their registries rather than listed here, so publishing
// a project is a flag flip in one file.
//
// Structure:
//   RootNode
//   ├── ProgramNode: Identity (who I am)
//   │   ├── ImportDeclaration: Resume
//   │   └── ImportDeclaration: Education
//   ├── BlockStatement: Projects (what I build)
//   │   └── FunctionDeclaration × PROJECT_NODES
//   ├── BlockStatement: Research (what I argue)
//   │   └── CallExpression: Rewiring the Interface
//   ├── BlockStatement: Skills (what I know)
//   │   └── ObjectExpression × SKILL_NODES
//   ├── VariableDeclaration: Timeline (where I've been)
//   │   └── ArrayExpression: Journey
//   ├── ExpressionStatement: Philosophy (what I think)
//   └── ExportDeclaration: Connect (how to reach me)

export const PORTFOLIO_AST = {
  id: "root",
  type: "RootNode",
  label: "Rajat Kumar",
  slug: "root",
  glowColor: "--ctp-text",
  content: {
    summary: "I build systems that think — and think about systems that build.",
    body: "The root node. Everything begins here.",
  },
  children: [
    // ── Identity ───────────────────────────────────────────────────────
    {
      id: "identity",
      type: "ProgramNode",
      label: "Identity",
      slug: "identity",
      glowColor: "--ctp-yellow",
      content: {
        summary: "import { Rajat } from 'chicago'",
        body: "Six years building production web systems end to end: multi-brand e-commerce serving 500K+ monthly users, and now the microservices, interfaces, and observability behind a top-10 US bank's collections operation. Increasingly, the work outside the day job is about the machinery of AI-assisted engineering itself — context management, token economics, and what it actually costs to hold a long agentic session together.",
      },
      children: [RESUME_NODE, EDUCATION_NODE],
      meta: {
        tags: ["identity", "about"],
        links: [
          { label: "GitHub", url: "https://github.com/RJonMshka" },
          { label: "LinkedIn", url: "https://linkedin.com/in/rajatkjon" },
        ],
      },
    },

    // ── Projects ───────────────────────────────────────────────────────
    {
      id: "projects",
      type: "BlockStatement",
      label: "Projects",
      slug: "projects",
      glowColor: "--ctp-peach",
      content: {
        summary: "Callable units of work, each with a public artifact behind it.",
        body: "FunctionDeclarations — defined inputs, defined outputs. Only projects with something publicly verifiable appear here: a public repo, a published package, a live site. The rest are written up and waiting on their repos to open.",
      },
      children: PROJECT_NODES,
      meta: {
        tags: ["projects"],
      },
    },

    // ── Research ───────────────────────────────────────────────────────
    RESEARCH_NODE,

    // ── Skills ─────────────────────────────────────────────────────────
    {
      id: "skills",
      type: "BlockStatement",
      label: "Skills",
      slug: "skills",
      glowColor: "--ctp-mauve",
      content: {
        summary: "The object expression: what I know and where I've used it.",
        body: "Skills as key-value pairs, grouped the way the work actually groups. No proficiency scores — a percentage next to a language name is a number nobody can check.",
      },
      children: SKILL_NODES,
      meta: {
        tags: ["skills"],
      },
    },

    // ── Timeline ───────────────────────────────────────────────────────
    TIMELINE_NODE,

    // ── Philosophy ─────────────────────────────────────────────────────
    {
      id: "philosophy",
      type: "ExpressionStatement",
      label: "Philosophy",
      slug: "philosophy",
      glowColor: "--ctp-lavender",
      content: {
        summary:
          "Three essays on consciousness, compilers, and the nature of understanding.",
        body: "Software isn't only a craft, it's a way of thinking. Building a compiler forces the question of what computation is, not just how to perform it. Running production systems at scale forces the question of what reliability means, not just how to measure it. The good work lives at that intersection — precise enough to be correct, general enough to be honest.\n\nThere is no separation between thinking work and building work. The design is in the code. The architecture is in the types. A well-named function is a philosophical claim.\n\nOn Vedanta: a real intellectual interest, not brand decoration. The recursive structure of awareness maps onto how computation gets thought about here. The site is an AST for that reason — the metaphor is load-bearing.",
      },
      children: [
        CODE_AS_CONSCIOUSNESS_NODE,
        WHY_I_BUILD_LANGUAGES_NODE,
        ON_AI_CONSCIOUSNESS_NODE,
      ],
      meta: {
        tags: ["philosophy", "essays"],
      },
    },

    // ── Connect ────────────────────────────────────────────────────────
    {
      id: "connect",
      type: "ExportDeclaration",
      label: "Connect",
      slug: "connect",
      glowColor: "--ctp-green",
      content: {
        summary: "export { github, linkedin, email } from 'rajat'",
        body: "The public API — direct links to where I exist online.",
      },
      children: [
        {
          id: "connect-github",
          type: "StringLiteral",
          label: "GitHub",
          slug: "connect-github",
          glowColor: "--ctp-green",
          content: {
            summary: "Where the code lives.",
            body: "Reachble, MFKit, RESUMIND, and the source for this site. Most of the rest is still private.",
          },
          meta: {
            links: [
              { label: "GitHub", url: "https://github.com/RJonMshka" },
            ],
          },
        },
        {
          id: "connect-linkedin",
          type: "StringLiteral",
          label: "LinkedIn",
          slug: "connect-linkedin",
          glowColor: "--ctp-green",
          content: {
            summary: "The professional graph.",
            body: "Career history, endorsements, and the network.",
          },
          meta: {
            links: [
              {
                label: "LinkedIn",
                url: "https://linkedin.com/in/rajatkjon",
              },
            ],
          },
        },
        {
          id: "connect-email",
          type: "StringLiteral",
          label: "Email",
          slug: "connect-email",
          glowColor: "--ctp-green",
          content: {
            summary: "The direct channel.",
            body: "For opportunities, collaborations, or conversations about compilers, consciousness, and code.",
          },
          meta: {
            links: [
              { label: "Email", url: "mailto:rajat1996kumar@gmail.com" },
            ],
          },
        },
      ],
      meta: {
        tags: ["connect", "contact"],
      },
    },
  ],
} satisfies ASTNode;
