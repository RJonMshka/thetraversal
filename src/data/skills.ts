import type { ASTNode } from "@/lib/ast-types";

// ── Skill data ─────────────────────────────────────────────────────────
// Skills are ObjectExpression nodes — key-value structures.
// Each skill item is a StringLiteral leaf with proficiency in meta.

export interface SkillItem {
  name: string;
  proficiency: number; // 0-100
  years: number;
}

// ── Language skills ────────────────────────────────────────────────────

const LANGUAGE_SKILLS: SkillItem[] = [
  { name: "TypeScript", proficiency: 92, years: 4 },
  { name: "JavaScript", proficiency: 90, years: 5 },
  { name: "Python", proficiency: 85, years: 4 },
  { name: "Java", proficiency: 75, years: 3 },
  { name: "Scala", proficiency: 60, years: 1 },
  { name: "SQL", proficiency: 80, years: 4 },
  { name: "HTML/CSS", proficiency: 88, years: 5 },
];

const FRAMEWORK_SKILLS: SkillItem[] = [
  { name: "React", proficiency: 92, years: 4 },
  { name: "Next.js", proficiency: 90, years: 3 },
  { name: "Node.js", proficiency: 88, years: 4 },
  { name: "Express", proficiency: 82, years: 3 },
  { name: "Tailwind CSS", proficiency: 85, years: 2 },
  { name: "Framer Motion", proficiency: 70, years: 1 },
  { name: "D3.js", proficiency: 65, years: 1 },
];

const SYSTEMS_SKILLS: SkillItem[] = [
  { name: "REST APIs", proficiency: 90, years: 4 },
  { name: "GraphQL", proficiency: 72, years: 2 },
  { name: "PostgreSQL", proficiency: 80, years: 3 },
  { name: "MongoDB", proficiency: 75, years: 2 },
  { name: "Redis", proficiency: 65, years: 1 },
  { name: "Docker", proficiency: 70, years: 2 },
  { name: "AWS", proficiency: 68, years: 2 },
];

const TOOLS_SKILLS: SkillItem[] = [
  { name: "Git", proficiency: 92, years: 5 },
  { name: "VS Code", proficiency: 90, years: 5 },
  { name: "Claude / AI Tools", proficiency: 88, years: 2 },
  { name: "Figma", proficiency: 60, years: 2 },
  { name: "Vercel", proficiency: 82, years: 2 },
  { name: "CI/CD", proficiency: 75, years: 3 },
  { name: "Linux/Unix", proficiency: 78, years: 4 },
];

// ── Skill nodes for the AST ───────────────────────────────────────────

function skillToNode(skill: SkillItem, parentSlug: string): ASTNode {
  return {
    id: `${parentSlug}-${skill.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
    type: "StringLiteral",
    label: skill.name,
    slug: `${parentSlug}-${skill.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
    glowColor: "--ctp-mauve",
    content: {
      summary: `${skill.proficiency}% proficiency · ${skill.years} year${skill.years !== 1 ? "s" : ""}`,
      body: `${skill.name}: ${skill.proficiency}% proficiency over ${skill.years} year${skill.years !== 1 ? "s" : ""} of active use.`,
    },
    meta: {
      tags: ["skill"],
    },
  };
}

export const LANGUAGES_NODE = {
  id: "skills-languages",
  type: "ObjectExpression",
  label: "Languages",
  slug: "skills-languages",
  glowColor: "--ctp-mauve",
  content: {
    summary: "TypeScript, JavaScript, Python, Java, Scala, SQL.",
    body: "The languages I think in. TypeScript is home — strict types, discriminated unions, and the satisfaction of a compiler that catches mistakes before they become bugs. Python for ML and scripting. Java from the enterprise trenches. Scala from the academic frontier.",
  },
  children: LANGUAGE_SKILLS.map((s) => skillToNode(s, "skills-languages")),
  meta: {
    tags: ["skills", "languages"],
  },
} satisfies ASTNode;

export const FRAMEWORKS_NODE = {
  id: "skills-frameworks",
  type: "ObjectExpression",
  label: "Frameworks",
  slug: "skills-frameworks",
  glowColor: "--ctp-mauve",
  content: {
    summary: "React, Next.js, Node.js, Express, Tailwind, D3.js.",
    body: "The frameworks I build with. React for UI composition, Next.js for the full-stack picture. Node.js because JavaScript everywhere is underrated. D3 for when data needs to become visual. Tailwind because life is too short for naming CSS classes.",
  },
  children: FRAMEWORK_SKILLS.map((s) => skillToNode(s, "skills-frameworks")),
  meta: {
    tags: ["skills", "frameworks"],
  },
} satisfies ASTNode;

export const SYSTEMS_NODE = {
  id: "skills-systems",
  type: "ObjectExpression",
  label: "Systems",
  slug: "skills-systems",
  glowColor: "--ctp-mauve",
  content: {
    summary: "REST, GraphQL, PostgreSQL, MongoDB, Docker, AWS.",
    body: "The infrastructure I reason about. APIs as contracts, databases as truth stores, containers as portable environments. I think about systems as layered abstractions — each layer providing guarantees to the one above it.",
  },
  children: SYSTEMS_SKILLS.map((s) => skillToNode(s, "skills-systems")),
  meta: {
    tags: ["skills", "systems"],
  },
} satisfies ASTNode;

export const TOOLS_NODE = {
  id: "skills-tools",
  type: "ObjectExpression",
  label: "Tools",
  slug: "skills-tools",
  glowColor: "--ctp-mauve",
  content: {
    summary: "Git, VS Code, Claude, Vercel, CI/CD, Linux.",
    body: "The tools I rely on daily. Git as a time machine. Claude as a thinking partner. Vercel for deployment that just works. The terminal as a primary interface — because GUIs are compiled CLIs.",
  },
  children: TOOLS_SKILLS.map((s) => skillToNode(s, "skills-tools")),
  meta: {
    tags: ["skills", "tools"],
  },
} satisfies ASTNode;

export const SKILL_NODES = [
  LANGUAGES_NODE,
  FRAMEWORKS_NODE,
  SYSTEMS_NODE,
  TOOLS_NODE,
] as const;
