import type { SourceEntity } from "@tv/ir";

// ── Education ──────────────────────────────────────────────────────────
// Source: docs/CONTENT-v2.md §5.

export const EDUCATION: SourceEntity[] = [
  {
    id: "education",
    kind: "education",
    label: "Education",
    summary: "import { MS, BTech } from \"./credentials\"",
    excerpt: "MS Computer Science from the University of Illinois at Chicago, 4.0 GPA, May 2023. BTech in Electronics & Communication Engineering from NIT Hamirpur, 3.65 GPA, May 2017.",
    tags: ["education", "identity"],
    children: ["education-uic", "education-nit"],
  },
  {
    id: "education-uic",
    kind: "degree",
    label: "UIC",
    summary: "MS Computer Science, GPA 4.0, May 2023.",
    excerpt: "University of Illinois at Chicago. Coursework: Reinforcement Learning, Artificial Intelligence, Cloud Computing, Object-Oriented Languages & Environments.\n\nThe Object-Oriented Languages course produced a Scala DSL built from scratch — the direct ancestor of Clause.",
    tags: ["education", "graduate"],
    date: "May 2023",
  },
  {
    id: "education-nit",
    kind: "degree",
    label: "NIT Hamirpur",
    summary: "BTech Electronics & Communication Engineering, GPA 3.65, May 2017.",
    excerpt: "National Institute of Technology, Hamirpur, India. Electronics and communication before software — signals, circuits, and information theory as the substrate under everything that came after.",
    tags: ["education", "undergraduate"],
    date: "May 2017",
  },
];
