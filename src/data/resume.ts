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
    summary: 'import resume from "./rajat-kumar.pdf"',
    body: "View or download resume in PDF/DOCX format.",
  },
  meta: {
    tags: ["resume", "identity"],
    links: [
      { label: "Download PDF", url: "/resume/rajat-kumar-resume.pdf" },
      { label: "Download DOCX", url: "/resume/rajat-kumar-resume.docx" },
    ],
  },
} satisfies ASTNode;

// ── Plain-text resume for `cat resume` command ─────────────────────────
export const RESUME_TEXT_LINES = [
  "╔══════════════════════════════════════════════╗",
  "║           RAJAT KUMAR                        ║",
  "║           Software Engineer                  ║",
  "╚══════════════════════════════════════════════╝",
  "",
  "EDUCATION",
  "  MS Computer Science — University of Illinois at Chicago",
  "",
  "EXPERIENCE",
  "  Capital One          — Software Engineer",
  "  Discover Financial   — Software Engineer",
  "",
  "SKILLS",
  "  Languages:   TypeScript, Python, Java, Scala, Go",
  "  Frameworks:  React, Next.js, Node.js, Express",
  "  Systems:     AWS, Docker, Kubernetes, PostgreSQL",
  "  Tools:       Git, CI/CD, Terraform, D3.js",
  "",
  "PROJECTS",
  "  RESUMIND       — AI-powered resume builder",
  "  Clause         — A programming language from scratch",
  "  AI Commit Gen  — Git commit message generator",
  "",
  "→ Download: /resume/rajat-kumar-resume.pdf",
  "→ View:     /node/resume",
];
