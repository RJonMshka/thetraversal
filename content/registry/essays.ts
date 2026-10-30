import type { SourceEntity } from "@tv/ir";

// ── Essays (was philosophy.ts) ─────────────────────────────────────────
// Each essay's long form is content/mdx/essays/<essayRef>.mdx.

export const ESSAYS: SourceEntity[] = [
  {
    id: "philosophy",
    kind: "essays",
    label: "Philosophy",
    summary: "Three essays on consciousness, compilers, and the nature of understanding.",
    excerpt: "Software isn't only a craft, it's a way of thinking. Building a compiler forces the question of what computation is, not just how to perform it. Running production systems at scale forces the question of what reliability means, not just how to measure it. The good work lives at that intersection — precise enough to be correct, general enough to be honest.\n\nThere is no separation between thinking work and building work. The design is in the code. The architecture is in the types. A well-named function is a philosophical claim.\n\nOn Vedanta: a real intellectual interest, not brand decoration. The recursive structure of awareness maps onto how computation gets thought about here. The site is an AST for that reason — the metaphor is load-bearing.",
    tags: ["philosophy", "essays"],
    children: ["code-as-consciousness", "why-i-build-languages", "on-ai-consciousness"],
  },
  {
    id: "code-as-consciousness",
    kind: "essay",
    label: "Code as Consciousness",
    summary: "The parallels between Advaita Vedanta's model of consciousness and how programs execute.",
    excerpt: "Exploring the runtime-program-observer pattern through Vedantic philosophy.",
    tags: ["philosophy", "advaita", "consciousness", "metaphor"],
    date: "2024",
    essayRef: "code-as-consciousness",
  },
  {
    id: "why-i-build-languages",
    kind: "essay",
    label: "Why I Build Languages",
    summary: "The compiler as the ultimate tool for understanding — if you can compile it, you understand it.",
    excerpt: "The journey from Thorsten Ball to Clause to this AST portfolio.",
    tags: ["philosophy", "compilers", "languages", "understanding"],
    date: "2024",
    essayRef: "why-i-build-languages",
  },
  {
    id: "on-ai-consciousness",
    kind: "essay",
    label: "On AI Consciousness",
    summary: "A genuine inquiry into whether AI systems have experience — informed by Vedantic philosophy and daily AI use.",
    excerpt: "Inquiring into AI consciousness through Vedantic philosophy and daily practice.",
    tags: ["philosophy", "ai", "consciousness", "vedanta"],
    date: "2024",
    essayRef: "on-ai-consciousness",
  },
];
