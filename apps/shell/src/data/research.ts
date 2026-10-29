import type { ASTNode } from "@/lib/ast-types";

// ── Research ───────────────────────────────────────────────────────────
// Written artifacts, as opposed to shipped software. A CallExpression is
// an invocation of thought — the same node type the philosophy essays use,
// because a paper is an argument being evaluated, not a unit of work.
//
// Source: docs/CONTENT-v2.md §2 "Rewiring the Interface".

export const REWIRING_THE_INTERFACE_NODE = {
  id: "rewiring-the-interface",
  type: "CallExpression",
  label: "Rewiring the Interface",
  slug: "rewiring-the-interface",
  glowColor: "--ctp-blue",
  content: {
    summary:
      "Ten patterns of interaction evolution, and what they mean for the people building interfaces.",
    body: "A synthesis paper testing the common claim that generative AI is a new interaction paradigm against the actual arc of HCI history — Licklider and Engelbart, batch processing and the command line, Shneiderman's direct manipulation, the GUI, touch, voice, and now conversational and agentic systems.\n\nThe argument is that AI interaction is a new layer atop prior paradigms rather than a replacement for them, and that its effects diverge sharply by generation and by context: consumer usage skews toward advice-seeking and writing, developer and enterprise usage toward coding and automation.",
    // Long-form reading surface: src/content/rewiring-the-interface.mdx
    deep: "rewiring-the-interface",
  },
  meta: {
    tags: [
      "research",
      "hci",
      "frontend-architecture",
      "generative-ui",
      "agentic-interfaces",
      "interaction-design",
    ],
    date: "July 2026",
  },
} satisfies ASTNode;

export const RESEARCH_NODE = {
  id: "research",
  type: "BlockStatement",
  label: "Research",
  slug: "research",
  glowColor: "--ctp-blue",
  content: {
    summary: "Written arguments. The thesis behind the code.",
    body: "The half of the work that produces a document rather than a binary. Where a project answers \"does it run,\" a paper answers \"is the premise true.\"",
  },
  children: [REWIRING_THE_INTERFACE_NODE],
  meta: {
    tags: ["research", "writing"],
  },
} satisfies ASTNode;
