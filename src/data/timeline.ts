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
    title: "MS Computer Science",
    organization: "University of Illinois at Chicago",
    date: "2019 – 2021",
    summary:
      "Graduate studies in CS. Compilers, distributed systems, and the Scala DSL that started everything.",
    body: "Graduate CS with compilers focus and Scala DSL coursework.",
    isCurrent: false,
  },
  {
    index: 1,
    title: "Software Engineer",
    organization: "Discover Financial Services",
    date: "2021 – 2023",
    summary:
      "Enterprise-scale engineering. Microservices, APIs, and learning what 'production' really means.",
    body: "Microservices and API platforms handling financial data at scale.",
    isCurrent: false,
  },
  {
    index: 2,
    title: "Software Engineer",
    organization: "Capital One",
    date: "2023 – Present",
    summary:
      "Building at the intersection of finance and technology. Cloud-native architecture and modern engineering practices.",
    body: "Cloud-native applications and platform engineering at scale.",
    isCurrent: true,
  },
  {
    index: 3,
    title: "Side Projects & Open Source",
    organization: "Independent",
    date: "2021 – Present",
    summary:
      "RESUMIND, Clause, AI Commit Generator, and this portfolio. Where curiosity becomes code.",
    body: "Side projects where curiosity becomes code: compilers, AI tools, and this portfolio.",
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
  };
}

// The array expression containing all timeline entries
export const TIMELINE_ARRAY_NODE = {
  id: "timeline-entries",
  type: "ArrayExpression",
  label: "Journey",
  slug: "timeline-entries",
  glowColor: "--ctp-teal",
  content: {
    summary: "UIC → Discover → Capital One → and the projects in between.",
    body: "A chronological traversal through education, industry, and independent exploration. Each entry is an element in an ever-growing array.",
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
