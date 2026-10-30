import { motion, AnimatePresence } from "framer-motion";
import { glowTint, glowValue } from "@/lib/glow";
import type { LayoutNode } from "@/hooks/useASTLayout";
import type { TraversalMode } from "@/lib/ast-types";
import { NODE_WIDTH } from "@/lib/node-dimensions";

// ── Props ──────────────────────────────────────────────────────────────

interface NodeContentPopoverProps {
  node: LayoutNode | null;
  mode: TraversalMode;
  /** Current D3 zoom transform so we can convert tree-space → screen-space */
  transform: { x: number; y: number; k: number };
  /** Bounding rect of the SVG container */
  svgRect: DOMRect | null;
}

// ── Constants ──────────────────────────────────────────────────────────

const POPOVER_WIDTH = 260;
const POPOVER_OFFSET_X = 16; // gap between node edge and popover

// ── Popover content derivation ─────────────────────────────────────────

function shouldShow(node: LayoutNode | null, mode: TraversalMode): boolean {
  if (!node || mode === "lex") return false;
  const hasSummary = Boolean(node.content?.summary);
  const hasBody = Boolean(node.content?.body);
  return hasSummary || hasBody;
}

// ── Component ──────────────────────────────────────────────────────────
// Rendered as a <foreignObject> inside the SVG so it participates in the
// same coordinate system but renders HTML (for text wrapping / overflow).
// Positioned in SVG-space alongside the hovered node.

export function NodeContentPopover({
  node,
  mode,
  transform,
  svgRect,
}: NodeContentPopoverProps) {
  const visible = shouldShow(node, mode);

  // Compute screen-space position of the node center
  // tree-space → screen-space: screenX = treeX * k + tx
  let screenX = 0;
  let glowColor = "--ctp-text";

  if (node && svgRect) {
    screenX = node.x * transform.k + transform.x;
    glowColor = node.glowColor;
  }

  // Half the node width in screen pixels
  const halfNodeW = (NODE_WIDTH / 2) * transform.k;

  // Decide whether popover appears to the right or left of the node.
  // Place right by default; flip left if it would overflow the SVG viewport.
  const rightEdgeIfRight =
    screenX + halfNodeW + POPOVER_OFFSET_X + POPOVER_WIDTH;
  const placeLeft =
    svgRect !== null && rightEdgeIfRight > svgRect.width - 16;

  // foreignObject x/y: top-left corner of the popover box in SVG coords
  // We convert back from screen-space to SVG-space for the foreignObject position.
  const nodeHalfW = NODE_WIDTH / 2; // tree-space half-width
  const foX = placeLeft
    ? node
      ? node.x - nodeHalfW - POPOVER_OFFSET_X / transform.k - POPOVER_WIDTH / transform.k
      : 0
    : node
    ? node.x + nodeHalfW + POPOVER_OFFSET_X / transform.k
    : 0;
  const foY = node ? node.y - 60 / transform.k : 0; // slight upward offset

  const foWidth = POPOVER_WIDTH / transform.k;

  const summary = node?.content?.summary ?? "";
  const body = node?.content?.body ?? "";
  const showBody = mode === "eval" && body.length > 0;

  return (
    <AnimatePresence>
      {visible && node && (
        <foreignObject
          key={node.slug}
          x={foX}
          y={foY}
          width={foWidth}
          height={800 / transform.k} // large enough; content clips naturally
          style={{ overflow: "visible", pointerEvents: "none" }}
        >
          {/* `any`: React's div props don't include xmlns, which an HTML child of an SVG foreignObject needs. */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <div {...({ xmlns: "http://www.w3.org/1999/xhtml" } as any)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 28,
                mass: 0.6,
              }}
              style={{
                width: `${POPOVER_WIDTH}px`,
                maxHeight: "320px",
                overflowY: "auto",
                background: "var(--color-ctp-mantle)",
                border: `1px solid ${glowValue(glowColor)}`,
                borderRadius: "8px",
                boxShadow: `0 0 20px 0 ${glowTint(glowColor, 20)}, 0 4px 24px rgba(0,0,0,0.5)`,
                padding: "12px 14px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                lineHeight: "1.6",
                color: "var(--color-ctp-text)",
                transformOrigin: placeLeft ? "right center" : "left center",
              }}
            >
              {/* Node label header */}
              <div
                style={{
                  color: glowValue(glowColor),
                  fontWeight: 700,
                  fontSize: "12px",
                  marginBottom: "8px",
                  letterSpacing: "0.03em",
                  borderBottom: `1px solid ${glowTint(glowColor, 13)}`,
                  paddingBottom: "6px",
                }}
              >
                {node.label}
              </div>

              {/* Summary */}
              {summary.length > 0 && (
                <div
                  style={{
                    color: "var(--color-ctp-subtext0)",
                    marginBottom: showBody ? "10px" : 0,
                    lineHeight: "1.65",
                  }}
                >
                  {summary}
                </div>
              )}

              {/* Body (eval mode) */}
              {showBody && (
                <>
                  <div
                    style={{
                      height: "1px",
                      background: glowTint(glowColor, 10),
                      marginBottom: "8px",
                    }}
                  />
                  <div
                    style={{
                      color: "var(--color-ctp-overlay1)",
                      fontSize: "10.5px",
                      lineHeight: "1.7",
                      opacity: 0.85,
                    }}
                  >
                    {body}
                  </div>
                </>
              )}

              {/* "Open" hint */}
              <div
                style={{
                  marginTop: "10px",
                  paddingTop: "6px",
                  borderTop: `1px solid ${glowTint(glowColor, 13)}`,
                  color: "var(--color-ctp-overlay0)",
                  fontSize: "9.5px",
                  letterSpacing: "0.04em",
                  opacity: 0.7,
                }}
              >
                {node.hasChildren
                  ? "click to expand · double-click to open"
                  : "click to open"}
              </div>
            </motion.div>
          </div>
        </foreignObject>
      )}
    </AnimatePresence>
  );
}
