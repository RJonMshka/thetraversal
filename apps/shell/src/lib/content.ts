import fs from "fs/promises";
import path from "path";
import { essayBodyId, type Body, type IRIndex } from "@tv/ir";

// ── IR body loader ─────────────────────────────────────────────────────
// Server-only. Reads compiled bodies from public/ir/v1, written by
// `pnpm --filter @tv/ir build`. Returns null when an entity has no body;
// callers fall back to the entity's excerpt.

// process.cwd() is apps/shell during next build and dev.
const IR_DIR = path.join(process.cwd(), "public", "ir", "v1");

let indexPromise: Promise<IRIndex> | null = null;

function loadIndex(): Promise<IRIndex> {
  indexPromise ??= fs
    .readFile(path.join(IR_DIR, "index.json"), "utf-8")
    .then((raw) => JSON.parse(raw) as IRIndex);
  return indexPromise;
}

async function loadBody(id: string): Promise<Body | null> {
  const rel = (await loadIndex()).bodies[id];
  if (!rel) return null;
  return JSON.parse(await fs.readFile(path.join(IR_DIR, rel), "utf-8")) as Body;
}

/** Node prose compiled from content/mdx/nodes/<slug>.mdx. */
export function loadNodeContent(slug: string): Promise<Body | null> {
  return loadBody(slug);
}

/** Long-form essay compiled from content/mdx/essays/<ref>.mdx. */
export function loadEssay(ref: string): Promise<Body | null> {
  return loadBody(essayBodyId(ref));
}
