import type { ASTNode } from "@/lib/ast-types";

// ── Philosophy metadata ────────────────────────────────────────────────
// Philosophy essays are CallExpression nodes — invocations of thought.
// Actual MDX content comes in Phase 7. These are the metadata shells.

export const CODE_AS_CONSCIOUSNESS_NODE = {
  id: "code-as-consciousness",
  type: "CallExpression",
  label: "Code as Consciousness",
  slug: "code-as-consciousness",
  glowColor: "--ctp-lavender",
  content: {
    summary:
      "The parallels between Advaita Vedanta's model of consciousness and how programs execute.",
    body: "Exploring the runtime-program-observer pattern through Vedantic philosophy.",
    deep: "code-as-consciousness",
  },
  meta: {
    tags: ["philosophy", "advaita", "consciousness", "metaphor"],
    date: "2024",
  },
} satisfies ASTNode;

export const WHY_I_BUILD_LANGUAGES_NODE = {
  id: "why-i-build-languages",
  type: "CallExpression",
  label: "Why I Build Languages",
  slug: "why-i-build-languages",
  glowColor: "--ctp-lavender",
  content: {
    summary:
      "The compiler as the ultimate tool for understanding — if you can compile it, you understand it.",
    body: "The journey from Thorsten Ball to Clause to this AST portfolio.",
    deep: "why-i-build-languages",
  },
  meta: {
    tags: ["philosophy", "compilers", "languages", "understanding"],
    date: "2024",
  },
} satisfies ASTNode;

export const ON_AI_CONSCIOUSNESS_NODE = {
  id: "on-ai-consciousness",
  type: "CallExpression",
  label: "On AI Consciousness",
  slug: "on-ai-consciousness",
  glowColor: "--ctp-lavender",
  content: {
    summary:
      "A genuine inquiry into whether AI systems have experience — informed by Vedantic philosophy and daily AI use.",
    body: "Inquiring into AI consciousness through Vedantic philosophy and daily practice.",
    deep: "on-ai-consciousness",
  },
  meta: {
    tags: ["philosophy", "ai", "consciousness", "vedanta"],
    date: "2024",
  },
} satisfies ASTNode;

export const PHILOSOPHY_NODES = [
  CODE_AS_CONSCIOUSNESS_NODE,
  WHY_I_BUILD_LANGUAGES_NODE,
  ON_AI_CONSCIOUSNESS_NODE,
] as const;
