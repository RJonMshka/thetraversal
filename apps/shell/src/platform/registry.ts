// ── Target registry (LLD-03 §3) ────────────────────────────────────────
// Ids are permanent URL segments. The shell knows targets by id only;
// where their code comes from is the loader's business.
//
// `unlisted`: the route exists (/t/<id> works when typed or linked) but the
// switcher does not offer it and the shell does not prefetch its manifest.
// For a target that is built but not deployed yet.

export const TARGETS = [
  { id: "ast", default: true },
  { id: "three" },
  // Unlisted until its Vercel project and TARGET_METRICS_ORIGIN exist (MIGRATION Phase 6).
  { id: "metrics", unlisted: true },
  { id: "build" },
] as const satisfies readonly {
  id: string;
  default?: true;
  unlisted?: true;
}[];

export type TargetId = (typeof TARGETS)[number]["id"];

export const DEFAULT_TARGET: TargetId = "ast";

/** Targets the switcher offers and the shell prefetches. */
export const LISTED_TARGETS: readonly TargetId[] = TARGETS.filter((t) => !("unlisted" in t)).map((t) => t.id);

export function isTargetId(id: string): id is TargetId {
  return TARGETS.some((t) => t.id === id);
}
