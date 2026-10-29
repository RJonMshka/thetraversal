import fs from "fs/promises";
import path from "path";

// ── MDX content loader ─────────────────────────────────────────────────
// Reads raw MDX from src/content/{slug}.mdx. Runs server-side only.
// Returns null if the file doesn't exist (graceful fallback).

const CONTENT_DIR = path.join(process.cwd(), "src", "content");

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
