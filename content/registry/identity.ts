import type { SourceEntity } from "@tv/ir";

// ── Root, identity, and the public API ─────────────────────────────────
// The root's children fix the top-level order every target sees.

export const IDENTITY: SourceEntity[] = [
  {
    id: "root",
    kind: "root",
    label: "Rajat Kumar",
    summary: "I build systems that think — and think about systems that build.",
    excerpt: "The root node. Everything begins here.",
    children: ["identity", "projects", "research", "skills", "timeline", "philosophy", "connect"],
  },
  {
    id: "identity",
    kind: "identity",
    label: "Identity",
    summary: "import { Rajat } from 'chicago'",
    excerpt: "Six years building production web systems end to end: multi-brand e-commerce serving 500K+ monthly users, and now the microservices, interfaces, and observability behind a top-10 US bank's collections operation. Increasingly, the work outside the day job is about the machinery of AI-assisted engineering itself — context management, token economics, and what it actually costs to hold a long agentic session together.",
    tags: ["identity", "about"],
    links: [
      { label: "GitHub", url: "https://github.com/RJonMshka" },
      { label: "LinkedIn", url: "https://linkedin.com/in/rajatkjon" },
    ],
    children: ["resume", "education"],
  },
  {
    id: "connect",
    kind: "connect",
    label: "Connect",
    summary: "export { github, linkedin, email } from 'rajat'",
    excerpt: "The public API — direct links to where I exist online.",
    tags: ["connect", "contact"],
    children: ["connect-github", "connect-linkedin", "connect-email"],
  },
  {
    id: "connect-github",
    kind: "channel",
    label: "GitHub",
    summary: "Where the code lives.",
    excerpt: "Reachble, MFKit, RESUMIND, and the source for this site. Most of the rest is still private.",
    links: [
      { label: "GitHub", url: "https://github.com/RJonMshka" },
    ],
  },
  {
    id: "connect-linkedin",
    kind: "channel",
    label: "LinkedIn",
    summary: "The professional graph.",
    excerpt: "Career history, endorsements, and the network.",
    links: [
      { label: "LinkedIn", url: "https://linkedin.com/in/rajatkjon" },
    ],
  },
  {
    id: "connect-email",
    kind: "channel",
    label: "Email",
    summary: "The direct channel.",
    excerpt: "For opportunities, collaborations, or conversations about compilers, consciousness, and code.",
    links: [
      { label: "Email", url: "mailto:rajat1996kumar@gmail.com" },
    ],
  },
];
