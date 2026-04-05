import type { ASTNode } from "@/lib/ast-types";

// ── Skill data ─────────────────────────────────────────────────────────
// Skills are ObjectExpression nodes — key-value structures.
// Each skill item is a StringLiteral leaf with proficiency in meta.

export interface SkillItem {
  name: string;
  proficiency: number; // 0-100
  years: number;
}

// ── Languages ──────────────────────────────────────────────────────────

const LANGUAGE_SKILLS: SkillItem[] = [
  { name: "TypeScript", proficiency: 95, years: 6 },
  { name: "JavaScript", proficiency: 95, years: 8 },
  { name: "Python", proficiency: 82, years: 4 },
  { name: "Java", proficiency: 80, years: 4 },
  { name: "Go", proficiency: 65, years: 2 },
  { name: "SQL", proficiency: 83, years: 6 },
  { name: "HTML/CSS", proficiency: 90, years: 8 },
];

// ── Frontend & Frameworks ──────────────────────────────────────────────

const FRAMEWORK_SKILLS: SkillItem[] = [
  { name: "React", proficiency: 93, years: 6 },
  { name: "Next.js", proficiency: 90, years: 4 },
  { name: "Angular", proficiency: 82, years: 3 },
  { name: "Node.js", proficiency: 88, years: 6 },
  { name: "RxJS", proficiency: 75, years: 3 },
  { name: "Tailwind CSS", proficiency: 85, years: 3 },
  { name: "Framer Motion", proficiency: 70, years: 1 },
  { name: "D3.js", proficiency: 65, years: 1 },
];

// ── Backend, APIs & Systems ────────────────────────────────────────────

const SYSTEMS_SKILLS: SkillItem[] = [
  { name: "Spring Boot", proficiency: 80, years: 3 },
  { name: "GraphQL", proficiency: 78, years: 3 },
  { name: "REST APIs", proficiency: 92, years: 8 },
  { name: "gRPC", proficiency: 62, years: 1 },
  { name: "Kafka", proficiency: 72, years: 2 },
  { name: "PostgreSQL", proficiency: 82, years: 4 },
  { name: "MongoDB", proficiency: 75, years: 3 },
  { name: "Redis", proficiency: 65, years: 2 },
];

// ── Cloud, DevOps & Tools ──────────────────────────────────────────────

const TOOLS_SKILLS: SkillItem[] = [
  { name: "Kubernetes", proficiency: 75, years: 2 },
  { name: "Docker", proficiency: 78, years: 3 },
  { name: "AWS", proficiency: 72, years: 3 },
  { name: "Datadog", proficiency: 80, years: 2 },
  { name: "Git", proficiency: 93, years: 8 },
  { name: "CI/CD", proficiency: 78, years: 4 },
  { name: "Vitest / Jest", proficiency: 82, years: 3 },
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
    summary: "TypeScript, JavaScript, Python, Java, Go, SQL, HTML/CSS.",
    body: "TypeScript, JavaScript, Python, Java, Go, SQL, HTML/CSS — across frontend, backend, and systems work.",
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
    summary: "React, Next.js, Angular, Node.js, RxJS, Tailwind, D3.js.",
    body: "React, Next.js, Angular, Node.js, RxJS, Tailwind CSS, Framer Motion, D3.js — frontend and runtime.",
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
    summary: "Spring Boot, GraphQL, REST, Kafka, PostgreSQL, MongoDB, Redis.",
    body: "Spring Boot, GraphQL, REST APIs, gRPC, Kafka, PostgreSQL, MongoDB, Redis — backend and data.",
  },
  children: SYSTEMS_SKILLS.map((s) => skillToNode(s, "skills-systems")),
  meta: {
    tags: ["skills", "systems"],
  },
} satisfies ASTNode;

export const TOOLS_NODE = {
  id: "skills-tools",
  type: "ObjectExpression",
  label: "Cloud & DevOps",
  slug: "skills-tools",
  glowColor: "--ctp-mauve",
  content: {
    summary: "Kubernetes, Docker, AWS, Datadog, Git, CI/CD, Vitest.",
    body: "Kubernetes, Docker, AWS, Datadog, Git, CI/CD, Vitest/Jest — infrastructure and observability.",
  },
  children: TOOLS_SKILLS.map((s) => skillToNode(s, "skills-tools")),
  meta: {
    tags: ["skills", "tools", "cloud", "devops"],
  },
} satisfies ASTNode;

export const SKILL_NODES = [
  LANGUAGES_NODE,
  FRAMEWORKS_NODE,
  SYSTEMS_NODE,
  TOOLS_NODE,
] as const;
