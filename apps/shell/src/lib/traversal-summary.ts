import type { Kind } from "@tv/ir";
import { ir } from "@/platform/ir";
import type { VisitEntry } from "@/state/shell-store";

// ── Traversal Summary Generator ────────────────────────────────────────
// A natural-language summary of which kinds of entity the visitor has
// explored. Static logic — fast and predictable.

type Facet = "builder" | "fluent" | "thinker" | "identity" | "connect" | "journey" | "versed";

// Containers and the root are not interesting for the phrase.
const FACET: Record<Kind, Facet | null> = {
  root: null,
  identity: "identity",
  resume: null,
  education: null,
  degree: "versed",
  section: null,
  project: "builder",
  paper: "thinker",
  essays: null,
  essay: "thinker",
  "skill-cluster": "fluent",
  skill: "versed",
  timeline: null,
  roles: "journey",
  role: "versed",
  connect: "connect",
  channel: "versed",
};

const PHRASE: Record<Facet, (labels: string[]) => string | null> = {
  builder: (labels) => `a builder of ${joinLabels(labels)}`,
  fluent: (labels) => `fluent in ${joinLabels(labels)}`,
  thinker: (labels) => `a thinker who contemplates ${joinLabels(labels)}`,
  identity: () => `an identity unfolding`,
  connect: () => `open to connection`,
  journey: (labels) => (labels.length > 0 ? `a journeyman through ${joinLabels(labels)}` : null),
  versed: (labels) => (labels.length > 0 ? `versed in ${joinLabels(labels)}` : null),
};

// Most interesting first.
const ORDER: Facet[] = ["builder", "fluent", "thinker", "identity", "connect", "journey", "versed"];

function joinLabels(labels: string[]): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  const last = labels[labels.length - 1];
  const rest = labels.slice(0, -1).join(", ");
  return `${rest}, and ${last}`;
}

// ── generateTraversalSummary ───────────────────────────────────────────
// Returns a sentence describing the visitor's traversal.
// Only fires when >= 8 entities have been visited.

export function generateTraversalSummary(entries: VisitEntry[]): string | null {
  if (entries.length < 8) return null;

  const byFacet = new Map<Facet, string[]>();
  for (const entry of entries) {
    const facet = FACET[entry.kind];
    if (!facet) continue;
    byFacet.set(facet, [...(byFacet.get(facet) ?? []), entry.label]);
  }

  const phrases: string[] = [];
  for (const facet of ORDER) {
    const labels = byFacet.get(facet);
    if (!labels || labels.length === 0) continue;
    const phrase = PHRASE[facet](labels);
    if (phrase) phrases.push(phrase);
  }

  if (phrases.length === 0) return null;
  return `You've explored Rajat as: ${phrases.join("; ")}.`;
}

// ── getTraversalDepth ──────────────────────────────────────────────────
// The deepest entity the visitor reached (root is depth 0).

export function getTraversalDepth(entries: VisitEntry[]): number {
  let maxDepth = 0;
  for (const entry of entries) {
    maxDepth = Math.max(maxDepth, ir.path(entry.id).length - 1);
  }
  return maxDepth;
}
