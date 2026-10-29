import type { SourceEntity } from "@tv/ir";

// ── Research ───────────────────────────────────────────────────────────
// Written artifacts, as opposed to shipped software. The long-form
// reading surface is content/mdx/essays/rewiring-the-interface.mdx.
//
// Source: docs/CONTENT-v2.md §2 "Rewiring the Interface".

export const RESEARCH: SourceEntity[] = [
  {
    id: "research",
    kind: "section",
    label: "Research",
    summary: "Written arguments. The thesis behind the code.",
    excerpt: "The half of the work that produces a document rather than a binary. Where a project answers \"does it run,\" a paper answers \"is the premise true.\"",
    tags: ["research", "writing"],
    children: ["rewiring-the-interface"],
  },
  {
    id: "rewiring-the-interface",
    kind: "paper",
    label: "Rewiring the Interface",
    summary: "Ten patterns of interaction evolution, and what they mean for the people building interfaces.",
    excerpt: "A synthesis paper testing the common claim that generative AI is a new interaction paradigm against the actual arc of HCI history — Licklider and Engelbart, batch processing and the command line, Shneiderman's direct manipulation, the GUI, touch, voice, and now conversational and agentic systems.\n\nThe argument is that AI interaction is a new layer atop prior paradigms rather than a replacement for them, and that its effects diverge sharply by generation and by context: consumer usage skews toward advice-seeking and writing, developer and enterprise usage toward coding and automation.",
    tags: ["research", "hci", "frontend-architecture", "generative-ui", "agentic-interfaces", "interaction-design"],
    date: "July 2026",
    essayRef: "rewiring-the-interface",
  },
];
