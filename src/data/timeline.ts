import type { ASTNode } from "@/lib/ast-types";

// ── Timeline data ──────────────────────────────────────────────────────
// Timeline entries are ArrayExpression items — ordered, indexed, sequential.
// The timeline is a VariableDeclaration containing an ArrayExpression.
//
// Source: docs/CONTENT-v2.md §4.

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
    title: "Associate L1 → Senior Associate, Experience Technology",
    organization: "Publicis Sapient",
    date: "Dec 2017 – Jul 2021",
    summary:
      "Three levels across four years. Multi-brand e-commerce architecture on SFCC/SFRA serving 500K+ monthly users, a REST-to-GraphQL migration, and micro frontends before the term was common.",
    body: "Co-designed a shared multi-brand frontend architecture on SFCC/SFRA for Kate Spade, Stuart Weitzman, and Coach — one codebase, per-brand theming, pluggable JS modules, no platform forks. A custom Service Worker caching layer written from scratch segmented HTML/CSS/JS by brand and content type.\n\nAs Associate L2: Webpack 5 bundling, the REST-to-GraphQL migration that cut over-fetching by roughly 60%, AWS Lambda ES6+ tuning worth about 30% lower execution cost, and an SVG spritesheet system.\n\nAs Associate L1: micro frontend architecture — genuinely early for 2017–2019 — plus ElasticSearch and Google Dialogflow NLP search on the Marriott account, covering hotel reservations, Homes & Villas, and a global search UI with a localStorage-backed listing cache rendering progressively.\n\nThe final level added SFRA architecture ownership, Service Worker caching, LCP/FCP optimization, Klarna/PayPal/Apple Pay integrations, AAA WCAG work, and technical interviewing. Page loads across engagements dropped 30–50% through lazy loading and code splitting.",
    isCurrent: false,
  },
  {
    index: 1,
    title: "MS Computer Science",
    organization: "University of Illinois at Chicago",
    date: "Aug 2021 – May 2023",
    summary:
      "4.0 GPA. Reinforcement learning, artificial intelligence, cloud computing, and the Scala DSL that became the ancestor of Clause.",
    body: "Came to UIC for the depth. Graduated with a 4.0 GPA in May 2023. Coursework: Reinforcement Learning, Artificial Intelligence, Cloud Computing, Object-Oriented Languages & Environments.\n\nThe OO Languages course was where things clicked — a Scala DSL built from scratch supporting set operations, classes, interfaces, inheritance, composition, dynamic dispatch, and partial evaluation. A complete language semantics exercise, and the direct ancestor of Clause.\n\nAlso: a policy-gradient RL agent for equities trading that beat its baseline by roughly 30% on returns over real historical data, and a distributed log pipeline in Scala with a gRPC client-server core over Akka HTTP and AWS Lambda.\n\nThe academic environment gave permission to go slow and go deep. Every project started from first principles.",
    isCurrent: false,
  },
  {
    index: 2,
    title: "Software Engineer Intern",
    organization: "Airblox",
    date: "May 2022 – Aug 2022",
    summary:
      "Full-stack task management application, a resource-efficient ETL flow, and internationalization across 5 languages.",
    body: "A summer at Airblox, AC Carrier Technologies Inc, in Chicago, during the MS program.\n\nBuilt a full-stack task management application handling projects and tasks across priority and severity levels — React frontend, Node.js/PostgreSQL backend. Contributed to a resource-efficient ETL flow on the existing cloud infrastructure.\n\nThe most interesting work was internationalization: user journeys across 5 languages, widening the addressable market by roughly 40%. Internationalizing an application touches every layer — string extraction, locale-aware formatting, bidirectional text, fallback chains. Doing it properly is a systems problem, not a translation problem.",
    isCurrent: false,
  },
  {
    index: 3,
    title: "Senior Software Engineer (Senior Associate, Application Engineering)",
    organization: "Capital One",
    date: "Jul 2023 – Present",
    summary:
      "Owns the collections operations console and the 15+ microservices behind it. Core engineer on the Discover → Capital One merger: 50M+ account migration, roughly 10M live to date, no service interruption on any owned system.",
    body: "Owns two Angular applications used daily by collection agents, including the business-critical operations console, plus the 15+ Spring Boot microservices, gateway router, and Kafka pipelines behind them.\n\nCore engineer on the Discover → Capital One merger integration: a 50M+ account migration, roughly 10M live to date, with no service interruption on any owned system. Merger work is the hardest kind of engineering — building new systems while the old ones run at full load.\n\nRan CWE analysis across every owned application on findings from an LLM-driven vulnerability scanner built for chained exploit paths conventional SAST misses, dispositioning each result with model-assisted review and shipping valid fixes alongside merger delivery.\n\nDesigned a Module Federation micro frontend architecture for the collection-agent UI so separate teams could deploy independently; approved as the platform's forward direction. Led the frontend test migration from Karma/Jasmine to Vitest with Playwright coverage. Stood up team-wide Datadog observability across the service mesh — RUM, APM, logs, custom SLOs — and tunes Kubernetes resources against live traffic, holding production incidents near zero.\n\nRuns a 30-day CVE remediation SLA and a rolling Angular major-version upgrade across every service, validated through formal change review. Built the Okta MFA integration for the agent-facing application, and is its SME and L2 escalation point.\n\nSets technical direction and reviews code for a cross-seniority team — including engineers senior in title — through structured demos on JavaScript semantics, async patterns, and RxJS.",
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
