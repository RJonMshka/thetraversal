import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

// ── Node Content Loader ────────────────────────────────────────────────
// Server-only content loader. Reads MDX files from src/content/nodes/
// and parses frontmatter for summary + body. Falls back to null if
// the file doesn't exist — callers should fall back to the inline
// content from the data layer.
//
// This module is the canonical way to load node prose. Data files hold
// fallback strings; MDX holds the real content; renderers prefer MDX.

const CONTENT_DIR = path.join(process.cwd(), "src", "content");

export interface NodeContent {
  summary: string;
  body: string; // raw MDX string
  deep?: string; // slug for full essay (philosophy nodes)
}

/**
 * Load content for a given node slug.
 * Looks in src/content/nodes/{slug}.mdx.
 * Returns null if not found — caller should use inline content.
 */
export async function loadNodeContent(
  slug: string
): Promise<NodeContent | null> {
  const filePath = path.join(CONTENT_DIR, "nodes", `${slug}.mdx`);

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(raw);
    return {
      summary: (data.summary as string) ?? "",
      body: content.trim(),
      deep: (data.deep as string) ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Load UI copy by key.
 * Looks in src/content/ui/{key}.mdx.
 */
export async function loadUICopy(key: string): Promise<string | null> {
  const filePath = path.join(CONTENT_DIR, "ui", `${key}.mdx`);

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return raw;
  } catch {
    return null;
  }
}
