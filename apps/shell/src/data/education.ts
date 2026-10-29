import type { ASTNode } from "@/lib/ast-types";

// ── Education Node ─────────────────────────────────────────────────────
// Lives under Identity as an ImportDeclaration — credentials imported
// from elsewhere rather than declared here.
//
// Source: docs/CONTENT-v2.md §5.

const UIC_NODE = {
  id: "education-uic",
  type: "StringLiteral",
  label: "UIC",
  slug: "education-uic",
  glowColor: "--ctp-yellow",
  content: {
    summary: "MS Computer Science, GPA 4.0, May 2023.",
    body: "University of Illinois at Chicago. Coursework: Reinforcement Learning, Artificial Intelligence, Cloud Computing, Object-Oriented Languages & Environments.\n\nThe Object-Oriented Languages course produced a Scala DSL built from scratch — the direct ancestor of Clause.",
  },
  meta: {
    tags: ["education", "graduate"],
    date: "May 2023",
  },
} satisfies ASTNode;

const NIT_NODE = {
  id: "education-nit",
  type: "StringLiteral",
  label: "NIT Hamirpur",
  slug: "education-nit",
  glowColor: "--ctp-yellow",
  content: {
    summary: "BTech Electronics & Communication Engineering, GPA 3.65, May 2017.",
    body: "National Institute of Technology, Hamirpur, India. Electronics and communication before software — signals, circuits, and information theory as the substrate under everything that came after.",
  },
  meta: {
    tags: ["education", "undergraduate"],
    date: "May 2017",
  },
} satisfies ASTNode;

export const EDUCATION_NODE = {
  id: "education",
  type: "ImportDeclaration",
  label: "Education",
  slug: "education",
  glowColor: "--ctp-yellow",
  content: {
    summary: 'import { MS, BTech } from "./credentials"',
    body: "MS Computer Science from the University of Illinois at Chicago, 4.0 GPA, May 2023. BTech in Electronics & Communication Engineering from NIT Hamirpur, 3.65 GPA, May 2017.",
  },
  children: [UIC_NODE, NIT_NODE],
  meta: {
    tags: ["education", "identity"],
  },
} satisfies ASTNode;
