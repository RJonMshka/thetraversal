import Link from "next/link";
import type { Entity } from "@tv/ir";
import { ir } from "@/platform/ir";

// ── Server outline (LLD-03 §9) ─────────────────────────────────────────
// Crawlable text version of the contains tree, rendered inside every
// target host. Shown until the target is ready; the last fallback.

function OutlineItem({ entity }: { entity: Entity }) {
  const children = ir.children(entity.id);
  return (
    <li className="mt-2">
      <Link href={`/node/${entity.id}`} className="text-ctp-text hover:text-ctp-lavender">
        {entity.label}
      </Link>
      {entity.summary && (
        <p className="text-xs leading-5" style={{ color: "var(--text-mute)" }}>
          {entity.summary}
        </p>
      )}
      {children.length > 0 && (
        <ul className="ml-4 border-l pl-3" style={{ borderColor: "var(--line)" }}>
          {children.map((child) => (
            <OutlineItem key={child.id} entity={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function Outline() {
  const root = ir.entity(ir.graph.rootId);
  if (!root) return null;
  return (
    <section data-outline aria-label="Portfolio outline" className="mx-auto max-w-3xl px-5 pb-16 pt-24 font-mono text-sm">
      <h1 className="text-base" style={{ color: "var(--tv-text)" }}>
        {root.label}
      </h1>
      {root.summary && (
        <p className="text-xs leading-5" style={{ color: "var(--text-mute)" }}>
          {root.summary}
        </p>
      )}
      <ul>
        {ir.children(root.id).map((child) => (
          <OutlineItem key={child.id} entity={child} />
        ))}
      </ul>
    </section>
  );
}
