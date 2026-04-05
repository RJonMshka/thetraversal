import type { ASTNode } from "@/lib/ast-types";

// ── Resume Node ────────────────────────────────────────────────────────
// Lives under the Identity node as an ImportDeclaration.
// Semantically: import resume from "./rajat-kumar.pdf"
// The resume is an external artifact being imported into the AST.

export const RESUME_NODE = {
  id: "resume",
  type: "ImportDeclaration",
  label: "Resume",
  slug: "resume",
  glowColor: "--ctp-yellow",
  content: {
    summary: 'import resume from "./Rajat-Kumar.pdf"',
    body: "View or download resume in PDF/DOCX format.",
  },
  meta: {
    tags: ["resume", "identity"],
    links: [
      { label: "Download PDF", url: "/resume/Rajat_Kumar_Resume.pdf" },
      { label: "Download DOCX", url: "/resume/Rajat_Kumar_Resume.docx" },
    ],
  },
} satisfies ASTNode;

// ── Plain-text resume for `cat resume` command ─────────────────────────
export const RESUME_TEXT_LINES = [
  "╔══════════════════════════════════════════════════════╗",
  "║  RAJAT KUMAR                                         ║",
  "║  Senior Software Engineer · Chicago, IL              ║",
  "║  rajat1996kumar@gmail.com · github.com/RJonMshka    ║",
  "╚══════════════════════════════════════════════════════╝",
  "",
  "EDUCATION",
  "  MS Computer Science (4.0 GPA) — UIC, May 2023",
  "  BTech Electronics & Communication — NIT Hamirpur, May 2017",
  "",
  "EXPERIENCE",
  "  Capital One (fmr. Discover)   — Sr. Associate App Engineer  Jul 2023–Present",
  "    15+ Spring Boot microservices, 2 Angular UIs, Kafka, Kubernetes, Datadog",
  "    Discover–Capital One merger integration · 5M+ customers",
  "  Airblox                       — Software Engineer Intern     May–Aug 2022",
  "    Full-stack task mgmt app · ETL pipeline · i18n (5 languages)",
  "  Publicis Sapient               — Sr. Associate Exp. Tech     Dec 2017–Jul 2021",
  "    GraphQL migration, AWS Lambda, NLP search, WCAG compliance, SFCC",
  "",
  "PROJECTS",
  "  RESUMIND        — AI resume optimizer (Next.js, Claude API, MCP)",
  "  Clause          — English-like language compiling to JS (Go)",
  "  dev-session     — AI context architecture for coding agents (TypeScript)",
  "  AI-Powered CRM  — Full-stack CRM with LLM workflows (Next.js, GraphQL, MCP)",
  "",
  "SKILLS",
  "  Languages:   TypeScript, JavaScript, Python, Java, Go, SQL",
  "  Frontend:    React, Next.js, Angular, RxJS, Tailwind CSS",
  "  Backend:     Spring Boot, Node.js, GraphQL, REST, Kafka, gRPC",
  "  Cloud:       AWS, Kubernetes, Docker, Datadog, CI/CD, Vercel",
  "  Databases:   PostgreSQL, MongoDB, Redis, Supabase",
  "",
  "→ Download: /resume/rajat-kumar-resume.pdf",
  "→ View:     /node/resume",
];
