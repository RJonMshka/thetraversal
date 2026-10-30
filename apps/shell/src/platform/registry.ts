// ── Target registry (LLD-03 §3) ────────────────────────────────────────
// Ids are permanent URL segments. The shell knows targets by id only;
// where their code comes from is the loader's business.

export const TARGETS = [{ id: "ast", default: true }, { id: "three" }] as const satisfies readonly {
  id: string;
  default?: true;
}[];

export type TargetId = (typeof TARGETS)[number]["id"];

export const DEFAULT_TARGET: TargetId = "ast";

export function isTargetId(id: string): id is TargetId {
  return TARGETS.some((t) => t.id === id);
}
