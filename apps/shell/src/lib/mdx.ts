import fs from "fs/promises";
import path from "path";

// ── MDX content loader ─────────────────────────────────────────────────
// Reads raw MDX from content/mdx/essays/{slug}.mdx. Runs server-side only.
// Returns null if the file doesn't exist (graceful fallback).

// process.cwd() is apps/shell during next build and dev.
const CONTENT_DIR = path.join(process.cwd(), "..", "..", "content", "mdx", "essays");

/**
 * Load the raw MDX source for a given slug.
 * Returns `null` if no file is found — callers should fall back
 * to the inline `content.body` from the data layer.
 */
export async function loadEssay(slug: string): Promise<string | null> {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);

  try {
    const source = await fs.readFile(filePath, "utf-8");
    return source;
  } catch {
    return null;
  }
}

/**
 * Check if an MDX essay exists for a given slug.
 */
export async function essayExists(slug: string): Promise<boolean> {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);

  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
