import type { TraversalMode } from "@/lib/ast-types";

// ── Node dimension constants ──────────────────────────────────────────
// Shared between ASTNode (rendering) and useASTLayout (layout math).
// Extracted here to avoid circular imports.

export const NODE_WIDTH = 180;

// ── Section heights ───────────────────────────────────────────────────
// Nodes are composed of stacked sections:
//   Header  — type badge + label (always visible)
//   Summary — wrapped summary text (parse + eval modes)
//   Body    — truncated body snippet (eval mode only)

export const HEADER_SECTION_HEIGHT = 52;
export const NODE_BASE_HEIGHT = HEADER_SECTION_HEIGHT;

export const SUMMARY_LINE_HEIGHT = 14;
export const MAX_SUMMARY_CHARS = 48;
export const MAX_SUMMARY_LINES = 2;

export const MAX_BODY_CHARS = 80;
export const MAX_BODY_LINES = 1;

/** Vertical padding inside summary/body section rects. */
export const SECTION_PADDING_Y = 6;

/** Gap between stacked section rects. */
export const SECTION_GAP = 2;

/** Compute the height of the summary section (0 if not applicable). */
export function getSummaryHeight(
  node: { content?: { summary?: string } },
  mode: TraversalMode
): number {
  if (mode === "lex") return 0;
  const hasSummary = Boolean(node.content?.summary);
  if (!hasSummary) return 0;

  const summaryLen = node.content!.summary!.length;
  const lines = Math.min(Math.ceil(summaryLen / MAX_SUMMARY_CHARS), MAX_SUMMARY_LINES);
  return lines * SUMMARY_LINE_HEIGHT + SECTION_PADDING_Y * 2;
}

/** Compute the height of the body section (0 if not applicable). */
export function getBodyHeight(
  node: { content?: { body?: string } },
  mode: TraversalMode
): number {
  if (mode !== "eval") return 0;
  const hasBody = Boolean(node.content?.body);
  if (!hasBody) return 0;

  const bodyLen = Math.min(node.content!.body!.length, MAX_BODY_CHARS);
  const lines = Math.min(Math.ceil(bodyLen / MAX_BODY_CHARS), MAX_BODY_LINES);
  return lines * SUMMARY_LINE_HEIGHT + SECTION_PADDING_Y * 2;
}

/** Compute the total rendered height for a node given the current traversal mode. */
export function getNodeHeight(
  node: { content?: { summary?: string; body?: string } },
  mode: TraversalMode
): number {
  const header = HEADER_SECTION_HEIGHT;
  const summary = getSummaryHeight(node, mode);
  const body = getBodyHeight(node, mode);

  let total = header;
  if (summary > 0) total += SECTION_GAP + summary;
  if (body > 0) total += SECTION_GAP + body;

  return total;
}
