import type { SourceRelation } from "@tv/ir";

// ── Cross-links that are not tree edges ────────────────────────────────
// `contains` comes from each entity's `children`; `uses` is derived from
// project stacks. Everything else is authored here.
//
// A relation that touches a draft is dropped with a build warning and
// comes back on its own when the draft is published.

export const RELATIONS: SourceRelation[] = [
  // The thesis triangle: projects that put "Rewiring the Interface" into code.
  { from: "mfkit", rel: "implements", to: "rewiring-the-interface" },
  { from: "kata", rel: "implements", to: "rewiring-the-interface" }, // draft
];

// Derived `uses` edges match a project's stack item to a skill label,
// case-insensitively. Add an entry here when the two are spelled
// differently (key: stack item in lowercase, value: skill label).
export const STACK_ALIASES: Record<string, string> = {};
