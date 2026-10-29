import type { ASTNode } from "@/lib/ast-types";

// ── Skill data ─────────────────────────────────────────────────────────
// Skills are ObjectExpression nodes — key-value structures.
// Each skill item is a StringLiteral leaf, individually traversable.
//
// Source: docs/CONTENT-v2.md §6. Categories and membership come straight
// from that file. There is deliberately no proficiency percentage here:
// CONTENT-v2 has no such data, and §8 rule 4 is "numbers only when true."

export interface SkillCategory {
  id: string;
  label: string;
  summary: string;
  body: string;
  items: string[];
}

const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: "skills-languages",
    label: "Languages",
    summary: "TypeScript, JavaScript, Python, Go, Java, Scala, SQL.",
    body: "The languages I think in. TypeScript is home — strict types, discriminated unions, and a compiler that catches mistakes before they become bugs. Python for ML and scripting, Go for compiler work, Java and Scala from the enterprise and graduate trenches, SQL because data has structure whether you model it or not.",
    items: ["TypeScript", "JavaScript", "Python", "Go", "Java", "Scala", "SQL"],
  },
  {
    id: "skills-ai",
    label: "AI & LLM Engineering",
    summary:
      "LLM integration, RAG, MCP, context engineering, agentic coding, evals, token economics.",
    body: "Agentic coding tools are systems with mechanics — ReAct loops, context windows, token budgets, subagent spawning — not magic boxes. This category is the result of taking those mechanics seriously: LLM integration and RAG, MCP as an architectural primitive, prompt and context engineering, LLM-assisted security triage, evals, and the token economics that decide whether any of it is affordable.",
    items: [
      "LLM integration",
      "RAG",
      "MCP",
      "Claude API",
      "Context engineering",
      "Prompt engineering",
      "Agentic coding",
      "LLM-assisted security triage",
      "Evals",
      "Token economics",
    ],
  },
  {
    id: "skills-frontend",
    label: "Frontend",
    summary:
      "React, Next.js, Angular, RxJS, Module Federation, micro frontends, Core Web Vitals, WCAG 2.2.",
    body: "Six years of frontend architecture, most of it on surfaces other people depend on daily. React and Next.js for composition and the full-stack picture. Angular in production at Capital One — reactive forms, lazy modules, a Karma-to-Vitest migration. Module Federation and micro frontends as an organizational tool, not a buzzword. Core Web Vitals and WCAG 2.2 because a page nobody can load or read is not shipped.",
    items: [
      "React",
      "Next.js",
      "Angular",
      "Redux",
      "RxJS",
      "Tailwind",
      "SCSS",
      "Three.js",
      "Webpack 5",
      "Vite",
      "Module Federation",
      "Micro frontends",
      "Core Web Vitals",
      "WCAG 2.2",
    ],
  },
  {
    id: "skills-backend",
    label: "Backend & APIs",
    summary:
      "Node.js, Spring Boot, GraphQL, REST, gRPC, microservices, Kafka, event-driven architecture.",
    body: "Spring Boot microservices in production at Capital One — 15+ services behind a gateway router, with Kafka pipelines between them. GraphQL as a data-layer abstraction: a REST-to-GraphQL migration at Publicis Sapient cut over-fetching by roughly 60%. APIs as contracts between systems — the interface is the architecture.",
    items: [
      "Node.js",
      "Bun",
      "Express",
      "Spring Boot",
      "GraphQL",
      "REST",
      "gRPC",
      "Microservices",
      "Kafka",
      "Event-driven architecture",
    ],
  },
  {
    id: "skills-cloud",
    label: "Cloud & Observability",
    summary:
      "AWS, Kubernetes/OpenShift, Docker, CI/CD, GitHub Actions, Vercel, Datadog.",
    body: "The infrastructure I operate. Kubernetes resource configs tuned against live traffic, holding production incidents near zero. A team-wide Datadog stack across the service mesh — RUM, APM, logs, custom SLOs. AWS from academic research through production workloads. CI/CD as the discipline of making deployment boring.",
    items: [
      "AWS Lambda",
      "S3",
      "EC2",
      "EMR",
      "CloudWatch",
      "API Gateway",
      "Kubernetes",
      "OpenShift",
      "Docker",
      "GitHub Actions",
      "Vercel",
      "Datadog",
    ],
  },
  {
    id: "skills-data",
    label: "Data",
    summary: "PostgreSQL, MongoDB, Redis, ElasticSearch, Supabase, Couchbase.",
    body: "PostgreSQL as the reliable truth store. MongoDB for document-oriented workloads. Redis for caching and sessions. ElasticSearch behind NLP-backed search at Publicis Sapient. Couchbase on the Marriott engagement, Supabase on side projects.",
    items: [
      "PostgreSQL",
      "MongoDB",
      "Redis",
      "ElasticSearch",
      "Supabase",
      "Couchbase",
    ],
  },
  {
    id: "skills-security",
    label: "Security & Compliance",
    summary:
      "CWE/CVE remediation, SAST triage, SBOM/VEX, OAuth 2.0, Okta SSO/MFA, CAB change management.",
    body: "A 30-day CVE remediation SLA across every owned service teaches you fast that most findings are noise, and that reachability is the difference between a real fix and a version bump performed as theater. That lesson is what Reachble is built on. Also: CWE analysis on LLM-driven scanner output, SBOM/VEX in CycloneDX and OpenVEX, Okta SSO/MFA integration, and formal change review.",
    items: [
      "CWE/CVE remediation",
      "SAST triage",
      "CycloneDX",
      "OpenVEX",
      "OAuth 2.0",
      "Okta SSO/MFA",
      "CAB change management",
    ],
  },
  {
    id: "skills-foundations",
    label: "Testing & Foundations",
    summary:
      "Vitest, Jest, Playwright, TDD, system design, distributed systems, concurrency, mentoring.",
    body: "Led the frontend test migration from Karma/Jasmine to Vitest with Playwright coverage, cutting CI time and moving the codebase onto a modern TypeScript/ESM toolchain. Underneath the tools: system design, distributed systems, concurrency, observability, code review, and the mentoring that makes any of it survive a team change.",
    items: [
      "Vitest",
      "Jest",
      "Playwright",
      "TDD",
      "System design",
      "Distributed systems",
      "Concurrency",
      "Observability",
      "Code review",
      "Technical mentoring",
    ],
  },
];

// ── Skill nodes for the AST ────────────────────────────────────────────

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function skillToNode(name: string, category: SkillCategory): ASTNode {
  const slug = `${category.id}-${slugify(name)}`;

  return {
    id: slug,
    type: "StringLiteral",
    label: name,
    slug,
    glowColor: "--ctp-mauve",
    content: {
      summary: `${name} · ${category.label.toLowerCase()}`,
      body: `${name} sits in the ${category.label} layer of the stack.\n\n${category.body}`,
    },
    meta: {
      tags: ["skill", ...category.label.toLowerCase().split(" & ")],
    },
  };
}

function categoryToNode(category: SkillCategory): ASTNode {
  return {
    id: category.id,
    type: "ObjectExpression",
    label: category.label,
    slug: category.id,
    glowColor: "--ctp-mauve",
    content: {
      summary: category.summary,
      body: category.body,
    },
    children: category.items.map((item) => skillToNode(item, category)),
    meta: {
      tags: ["skills", ...category.label.toLowerCase().split(" & ")],
    },
  };
}

export const SKILL_NODES: ASTNode[] = SKILL_CATEGORIES.map(categoryToNode);

export { SKILL_CATEGORIES };
