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
    body: `Came to UIC for the rigor. Stayed for the compilers course that rewired how I think about software. Built a Scala DSL for data transformations as part of my coursework — the first time I experienced the power of defining your own language for a domain.

Also explored distributed systems, machine learning foundations, and software architecture. The academic environment gave me permission to go deep — to understand not just how to use tools, but how they're built.`,
    isCurrent: false,
  },
  {
    index: 1,
    title: "Software Engineer",
    organization: "Discover Financial Services",
    date: "2021 – 2023",
    summary:
      "Enterprise-scale engineering. Microservices, APIs, and learning what 'production' really means.",
    body: `First industry role. Built and maintained microservices handling financial data at scale. Learned the difference between code that works and code that works at 2 AM on a Saturday when the on-call page fires.

Worked on API platforms, internal tooling, and data pipeline orchestration. The enterprise environment taught me about constraints — regulatory requirements, backward compatibility, and the art of shipping incremental improvements without breaking what exists.`,
    isCurrent: false,
  },
  {
    index: 2,
    title: "Software Engineer",
    organization: "Capital One",
    date: "2023 – Present",
    summary:
      "Building at the intersection of finance and technology. Cloud-native architecture and modern engineering practices.",
    body: `Current role. Working on cloud-native applications in a fast-moving engineering culture. The scale is larger, the problems are harder, and the emphasis on engineering excellence is constant.

Building with modern TypeScript, React, and cloud infrastructure. Contributing to platform engineering efforts that serve hundreds of developers. The role reinforces my belief that the best engineering is invisible — users don't see the architecture, they feel the experience.`,
    isCurrent: true,
  },
  {
    index: 3,
    title: "Side Projects & Open Source",
    organization: "Independent",
    date: "2021 – Present",
    summary:
      "RESUMIND, Clause, AI Commit Generator, and this portfolio. Where curiosity becomes code.",
    body: `The work that keeps me sharp. Side projects are where I take risks — new languages, new paradigms, new ideas. Clause taught me compilers. RESUMIND taught me AI integration. The AI Commit Generator taught me developer tooling. This portfolio taught me that the medium really is the message.

Each project starts the same way: "I wonder if I could..." followed by weeks of obsessive building. The best projects are the ones where the process teaches me something I didn't expect.`,
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
