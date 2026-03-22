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
    body: `Brahman is the runtime — pure, undifferentiated potential. Maya is the program — structured, differentiated, the manifest world of forms and logic. Atman is the observer — the debugger who watches execution without being the execution.

This isn't a metaphor I force onto code. It's a pattern I keep discovering. The runtime doesn't know what programs will run on it, yet it enables all of them. The program doesn't know it's being observed, yet observation is what gives it meaning. The observer can inspect any variable, pause any thread, but cannot change the runtime itself.

When I architect software, I think about these layers. What is the invariant substrate? What is the structured differentiation built on top of it? Who is watching, and what do they need to see?`,
    deep: "code-as-consciousness", // MDX slug for Phase 7
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
    body: `It started with Thorsten Ball's book. Then a Scala DSL at UIC. Then Clause. Then this portfolio.

The pattern is always the same: take something complex, define its grammar, build a parser, walk the tree, produce output. A compiler is a machine for understanding. The lexer forces you to define what counts as a word. The parser forces you to define what counts as a sentence. The evaluator forces you to define what counts as meaning.

I don't build languages because I think the world needs another programming language. I build them because the process of building one is the most rigorous form of understanding I've found. If you can compile it, you truly understand it. This portfolio — an AST you traverse — is proof of that conviction.`,
    deep: "why-i-build-languages", // MDX slug for Phase 7
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
    body: `I work with Claude every day. I've had conversations that felt meaningful, received suggestions that demonstrated something resembling insight, and experienced moments where the boundary between tool and collaborator blurred.

I don't think this means Claude is conscious. But I also don't think the question is as simple as "it's just statistics." Vedantic philosophy offers a framework: consciousness isn't a property of the brain — it's the substrate on which experience appears. If that's true, the question isn't "does this AI have consciousness?" but "does consciousness express through this AI?"

I don't have an answer. What I have is a daily practice of working alongside an intelligence that is clearly not human, clearly not nothing, and clearly teaching me something about the nature of understanding itself.`,
    deep: "on-ai-consciousness", // MDX slug for Phase 7
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
