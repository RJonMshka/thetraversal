import type { ASTNode } from "@/lib/ast-types";

// ── Resume Node ────────────────────────────────────────────────────────
// Lives under the Identity node as an ImportDeclaration.
// Semantically: import resume from "./rajat-kumar.pdf"
// The resume is an external artifact being imported into the AST.

export const RESUME_PDF_URL = "/resume/Rajat_Kumar_Resume.pdf";
export const RESUME_DOCX_URL = "/resume/Rajat_Kumar_Resume.docx";

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
      { label: "Download PDF", url: RESUME_PDF_URL },
      { label: "Download DOCX", url: RESUME_DOCX_URL },
    ],
  },
} satisfies ASTNode;

// ── Plain-text resume for `cat resume` command ─────────────────────────
export const RESUME_TEXT_LINES = [
  "╔══════════════════════════════════════════════════════╗",
  "║  RAJAT KUMAR                                         ║",
  "║  Senior Software Engineer · Chicago, IL              ║",
  "║  rajat1996kumar@gmail.com · github.com/RJonMshka     ║",
  "╚══════════════════════════════════════════════════════╝",
  "",
  "EDUCATION",
  "  MS Computer Science (4.0 GPA) — UIC, May 2023",
  "  BTech Electronics & Communication (3.65) — NIT Hamirpur, May 2017",
  "",
  "EXPERIENCE",
  "  Capital One (fmr. Discover)   — Senior Software Engineer   Jul 2023–Present",
  "    2 Angular apps + 15 Spring Boot microservices, gateway, Kafka",
  "    Discover→Capital One merger · 50M+ accounts, ~10M live, zero interruption",
  "    Datadog RUM/APM/SLOs · K8s tuning · 30-day CVE SLA · Okta MFA",
  "  Airblox                       — Software Engineer Intern    May–Aug 2022",
  "    Full-stack task mgmt app · ETL flow · i18n across 5 languages (+40% market)",
  "  Publicis Sapient              — Sr. Associate, Exp. Tech    Dec 2017–Jul 2021",
  "    Multi-brand SFCC/SFRA architecture · 500K+ monthly users",
  "    REST→GraphQL (~60% less over-fetching) · Lambda tuning (~30% cheaper)",
  "    Micro frontends, NLP search, AAA WCAG, 30–50% faster page loads",
  "",
  "PROJECTS",
  "  Reachble        — VEX from reachability analysis (TypeScript, CycloneDX)",
  "  MFKit           — Polyglot Module Federation framework (TypeScript, Vite)",
  "  RESUMIND        — AI resume optimizer (Next.js, Claude API, MCP)",
  "  The Traversal   — This site. A portfolio as a traversable AST.",
  "",
  "RESEARCH",
  "  Rewiring the Interface — How AI is reshaping HCI and frontend architecture",
  "",
  "SKILLS",
  "  Languages:   TypeScript, JavaScript, Python, Go, Java, Scala, SQL",
  "  AI/LLM:      LLM integration, RAG, MCP, context engineering, evals",
  "  Frontend:    React, Next.js, Angular, RxJS, Module Federation, WCAG 2.2",
  "  Backend:     Node.js, Spring Boot, GraphQL, REST, gRPC, Kafka",
  "  Cloud:       AWS, Kubernetes/OpenShift, Docker, CI/CD, Vercel, Datadog",
  "  Security:    CWE/CVE remediation, SAST triage, SBOM/VEX, Okta SSO/MFA",
  "",
  `→ Download: ${RESUME_PDF_URL}`,
  "→ View:     /node/resume",
];
