import type { ASTNode } from "@/lib/ast-types";

// ── Timeline data ──────────────────────────────────────────────────────
// Timeline entries are ArrayExpression items — ordered, indexed, sequential.
// The timeline is a VariableDeclaration containing an ArrayExpression.

export interface TimelineEntry {
  index: number;
  title: string;
  organization: string;
  date: string;
  summary: string;
  body: string;
  isCurrent?: boolean;
}

const TIMELINE_ENTRIES: TimelineEntry[] = [
  {
    index: 0,
    title: "Associate → Senior Associate",
    organization: "Publicis Sapient",
    date: "Dec 2017 – Jul 2021",
    summary:
      "Four years across e-commerce and financial clients. GraphQL migrations, AWS Lambda, NLP search, WCAG compliance, and frontend architecture at scale.",
    body: "E-commerce and financial web platforms. REST-to-GraphQL migration, AWS Lambda, NLP search, WCAG compliance.",
    isCurrent: false,
  },
  {
    index: 1,
    title: "MS Computer Science",
    organization: "University of Illinois at Chicago",
    date: "Aug 2021 – May 2023",
    summary:
      "4.0 GPA. Reinforcement learning, distributed systems, cloud computing, and the Scala DSL that became the ancestor of Clause.",
    body: "MS CS at UIC. 4.0 GPA. RL for financial trading, distributed log processing, Scala DSL from scratch.",
    isCurrent: false,
  },
  {
    index: 2,
    title: "Software Engineer Intern",
    organization: "Airblox",
    date: "May 2022 – Aug 2022",
    summary:
      "Full-stack task management app, ETL pipeline on existing cloud infrastructure, and internationalization across 5 languages.",
    body: "React + Node.js + PostgreSQL task management app. ETL flow. i18n across 5 languages.",
    isCurrent: false,
  },
  {
    index: 3,
    title: "Senior Associate Application Engineer",
    organization: "Capital One (formerly Discover)",
    date: "Jul 2023 – Present",
    summary:
      "Owns a production ecosystem of 15+ Spring Boot microservices and 2 Angular UIs. Merger integration affecting 5M+ customers. Datadog observability, Kubernetes tuning, Okta 2FA.",
    body: "15+ microservices, Angular UIs, Kafka, Kubernetes, Datadog. Discover–Capital One merger integration at scale.",
    isCurrent: true,
  },
];

// Convert timeline entries to AST nodes
function timelineToNode(entry: TimelineEntry): ASTNode {
  return {
    id: `timeline-${entry.index}`,
    type: "StringLiteral",
    label: `${entry.organization}`,
    slug: `timeline-${entry.index}`,
    glowColor: "--ctp-teal",
    content: {
      summary: entry.summary,
      body: entry.body,
    },
    meta: {
      date: entry.date,
      tags: entry.isCurrent ? ["current"] : [],
    },
  } satisfies ASTNode;
}

// The array expression containing all timeline entries
export const TIMELINE_ARRAY_NODE = {
  id: "timeline-entries",
  type: "ArrayExpression",
  label: "Journey",
  slug: "timeline-entries",
  glowColor: "--ctp-teal",
  content: {
    summary: "Publicis Sapient → UIC → Airblox → Capital One.",
    body: "A chronological traversal through industry, graduate school, and back to production. Each entry is an element in an ever-growing array.",
  },
  children: TIMELINE_ENTRIES.map(timelineToNode),
  meta: {
    tags: ["timeline"],
  },
} satisfies ASTNode;

// The variable declaration wrapping the array
export const TIMELINE_NODE = {
  id: "timeline",
  type: "VariableDeclaration",
  label: "Timeline",
  slug: "timeline",
  glowColor: "--ctp-teal",
  content: {
    summary: "const journey: Experience[] — the ordered sequence of where I've been.",
    body: "Career as an array — indexed, ordered, iterable. Each element builds on the last. The current index keeps incrementing.",
  },
  children: [TIMELINE_ARRAY_NODE],
  meta: {
    tags: ["timeline", "career"],
  },
} satisfies ASTNode;

export { TIMELINE_ENTRIES };
