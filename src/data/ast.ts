import type { ASTNode } from "@/lib/ast-types";
import {
  RESUMIND_NODE,
  CLAUSE_NODE,
  AI_COMMIT_NODE,
  CRM_NODE,
} from "@/data/projects";
import {
  LANGUAGES_NODE,
  FRAMEWORKS_NODE,
  SYSTEMS_NODE,
  TOOLS_NODE,
} from "@/data/skills";
import { TIMELINE_NODE } from "@/data/timeline";
import { RESUME_NODE } from "@/data/resume";
import {
  CODE_AS_CONSCIOUSNESS_NODE,
  WHY_I_BUILD_LANGUAGES_NODE,
  ON_AI_CONSCIOUSNESS_NODE,
} from "@/data/philosophy";

// ── The Master AST ─────────────────────────────────────────────────────
// The complete portfolio tree. Every node is discoverable, traversable,
// and directly linkable via /node/[slug].
//
// Structure:
//   RootNode
//   ├── ProgramNode: Identity (who I am)
//   │   └── ImportDeclaration: Resume
//   ├── BlockStatement: Projects (what I build)
//   │   ├── FunctionDeclaration: RESUMIND
//   │   ├── FunctionDeclaration: Clause
//   │   ├── FunctionDeclaration: AI Commit Generator
//   │   └── FunctionDeclaration: CRM Tool
//   ├── BlockStatement: Skills (what I know)
//   │   ├── ObjectExpression: Languages
//   │   ├── ObjectExpression: Frameworks
//   │   ├── ObjectExpression: Systems
//   │   └── ObjectExpression: Tools
//   ├── VariableDeclaration: Timeline (where I've been)
//   │   └── ArrayExpression: Journey
//   │       ├── StringLiteral: UIC
//   │       ├── StringLiteral: Discover
//   │       ├── StringLiteral: Capital One
//   │       └── StringLiteral: Side Projects
//   ├── ExpressionStatement: Philosophy (what I think)
//   │   ├── CallExpression: Code as Consciousness
//   │   ├── CallExpression: Why I Build Languages
//   │   └── CallExpression: On AI Consciousness
//   └── ExportDeclaration: Connect (how to reach me)

export const PORTFOLIO_AST = {
  id: "root",
  type: "RootNode",
  label: "Rajat Kumar",
  slug: "root",
  glowColor: "--ctp-text",
  content: {
    summary: "Software engineer. Systems thinker. Builder of languages.",
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
        body: "Software engineer based in Chicago. Builder of compilers, AI tools, and this portfolio.",
      },
      children: [RESUME_NODE],
      meta: {
        tags: ["identity", "about"],
        links: [
          { label: "GitHub", url: "https://github.com/rajatkumar" },
          { label: "LinkedIn", url: "https://linkedin.com/in/rajatkumar" },
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
        summary: "Four functions, each solving a different problem.",
        body: "FunctionDeclarations — callable units of work with defined inputs and outputs.",
      },
      children: [RESUMIND_NODE, CLAUSE_NODE, AI_COMMIT_NODE, CRM_NODE],
      meta: {
        tags: ["projects"],
      },
    },

    // ── Skills ─────────────────────────────────────────────────────────
    {
      id: "skills",
      type: "BlockStatement",
      label: "Skills",
      slug: "skills",
      glowColor: "--ctp-mauve",
      content: {
        summary: "The object expression: what I know and how well I know it.",
        body: "Skills as key-value pairs. Proficiency is honest.",
      },
      children: [LANGUAGES_NODE, FRAMEWORKS_NODE, SYSTEMS_NODE, TOOLS_NODE],
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
        body: "Genuine inquiries into code, consciousness, and meaning.",
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
            body: "My GitHub profile. Open source contributions, side projects, and the source code for this portfolio.",
          },
          meta: {
            links: [
              { label: "GitHub", url: "https://github.com/rajatkumar" },
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
            body: "My LinkedIn profile. Career history, endorsements, and the network.",
          },
          meta: {
            links: [
              {
                label: "LinkedIn",
                url: "https://linkedin.com/in/rajatkumar",
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
              { label: "Email", url: "mailto:rajat@example.com" },
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
