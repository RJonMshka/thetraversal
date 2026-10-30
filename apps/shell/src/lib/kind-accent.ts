import type { Entity, IRClient, Kind } from "@tv/ir";

// ── Kind accents for shell chrome ──────────────────────────────────────
// The shell colors entities by kind (context window, node pages). The
// AST keeps its own glow mapping in its projection; these match it.
// A section takes the accent of what it groups.

export type Accent = "text" | "yellow" | "peach" | "blue" | "lavender" | "mauve" | "teal" | "green";

const KIND_ACCENT: Record<Kind, Accent | "inherit"> = {
  root: "text",
  identity: "yellow",
  resume: "yellow",
  education: "yellow",
  degree: "yellow",
  section: "inherit",
  project: "peach",
  paper: "blue",
  essays: "lavender",
  essay: "lavender",
  "skill-cluster": "mauve",
  skill: "mauve",
  timeline: "teal",
  roles: "teal",
  role: "teal",
  connect: "green",
  channel: "green",
};

export function accentOf(entity: Entity, ir: IRClient): Accent {
  const accent = KIND_ACCENT[entity.kind];
  if (accent !== "inherit") return accent;
  const first = ir.children(entity.id)[0];
  return first ? accentOf(first, ir) : "text";
}

export interface AccentClasses {
  border: string;
  text: string;
  shadow: string;
}

// Full class names, so Tailwind sees them.
const CLASSES: Record<Accent, AccentClasses> = {
  text: { border: "border-ctp-text/20", text: "text-ctp-text", shadow: "shadow-ctp-text/5" },
  yellow: { border: "border-ctp-yellow/30", text: "text-ctp-yellow", shadow: "shadow-ctp-yellow/10" },
  peach: { border: "border-ctp-peach/30", text: "text-ctp-peach", shadow: "shadow-ctp-peach/10" },
  blue: { border: "border-ctp-blue/30", text: "text-ctp-blue", shadow: "shadow-ctp-blue/10" },
  lavender: { border: "border-ctp-lavender/30", text: "text-ctp-lavender", shadow: "shadow-ctp-lavender/10" },
  mauve: { border: "border-ctp-mauve/30", text: "text-ctp-mauve", shadow: "shadow-ctp-mauve/10" },
  teal: { border: "border-ctp-teal/30", text: "text-ctp-teal", shadow: "shadow-ctp-teal/10" },
  green: { border: "border-ctp-green/30", text: "text-ctp-green", shadow: "shadow-ctp-green/10" },
};

export function accentClasses(accent: Accent): AccentClasses {
  return CLASSES[accent];
}
