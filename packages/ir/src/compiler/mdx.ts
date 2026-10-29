import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import { toHtml } from "hast-util-to-html";
import { visit } from "unist-util-visit";
import type { Element, ElementContent, Root } from "hast";
import type { Body } from "../schema";

// ── MDX → sanitized HTML (LLD-01 §4) ───────────────────────────────────
// Same parser and plugins the shell used through next-mdx-remote, so the
// element tree is unchanged; only the output format differs. Element
// styling lives in @tv/tokens/prose.css under `.tv-prose`.

export interface Frontmatter {
  summary?: string;
  deep?: string;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Splits `key: "value"` frontmatter (the only form the content uses). */
export function splitFrontmatter(raw: string): { data: Frontmatter; content: string } {
  const match = FRONTMATTER.exec(raw);
  if (!match) return { data: {}, content: raw };
  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const value = kv[2].trim();
    data[kv[1]] = value.startsWith('"') ? (JSON.parse(value) as string) : value;
  }
  return { data, content: raw.slice(match[0].length) };
}

/** Same estimate the essay page has always shown. */
export function readingMinutes(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function textOf(node: ElementContent | Element): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(textOf).join("");
  return "";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

/** Heading ids for the table of contents, plus new-tab external links. */
function rehypeAnnotate() {
  return (tree: Root, file: { data: Record<string, unknown> }) => {
    const seen = new Map<string, number>();
    const toc: Body["toc"] = [];
    visit(tree, "element", (node: Element) => {
      const depth = /^h([1-6])$/.exec(node.tagName)?.[1];
      if (depth) {
        const text = textOf(node);
        const base = slugify(text) || "section";
        const n = seen.get(base) ?? 0;
        seen.set(base, n + 1);
        const id = n === 0 ? base : `${base}-${n}`;
        node.properties.id = id;
        toc.push({ id, text, depth: Number(depth) });
      }
      if (node.tagName === "a" && String(node.properties.href ?? "").startsWith("http")) {
        node.properties.target = "_blank";
        node.properties.rel = ["noopener", "noreferrer"];
      }
    });
    file.data.toc = toc;
  };
}

// GitHub's allowlist, plus what shiki/rehype-pretty-code and the
// annotations above emit. Ids are kept verbatim (no "user-content-").
const SANITIZE: SanitizeSchema = {
  ...defaultSchema,
  clobber: [],
  clobberPrefix: "",
  tagNames: [...(defaultSchema.tagNames ?? []), "figure", "figcaption"],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), "target", "rel"],
    figure: ["data*"],
    figcaption: ["data*"],
    pre: [...(defaultSchema.attributes?.pre ?? []), "data*", "style", "tabIndex"],
    code: [...(defaultSchema.attributes?.code ?? []), "data*", "style"],
    span: [...(defaultSchema.attributes?.span ?? []), "data*", "style"],
    h1: ["id"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    h5: ["id"],
    h6: ["id"],
  },
};

function rehypeCapture() {
  return (tree: Root, file: { data: Record<string, unknown> }) => {
    file.data.html = toHtml(tree);
  };
}

/** Compiles one MDX document (frontmatter already removed) to a Body. */
export async function compileBody(
  id: string,
  content: string,
  minutesSource: string = content
): Promise<Body> {
  const file = await compile(content, {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      [rehypePrettyCode, { theme: "catppuccin-mocha", keepBackground: false }],
      rehypeAnnotate,
      [rehypeSanitize, SANITIZE],
      rehypeCapture,
    ],
  });
  return {
    id,
    html: String(file.data.html ?? ""),
    toc: (file.data.toc as Body["toc"] | undefined) ?? [],
    readingMinutes: readingMinutes(minutesSource),
  };
}
