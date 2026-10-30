import { KIND_TAG } from "@/lib/kind-label";
import { ir } from "@/platform/ir";
import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/card";

export const alt = "The Traversal — Rajat Kumar";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return Object.keys(ir.graph.entities).map((slug) => ({ slug }));
}

const MAX_SUBTITLE = 140;

function truncate(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entity = ir.entity(slug);

  if (!entity) {
    return renderOgCard({
      kicker: "Error",
      title: "Node not found",
      subtitle: "This path does not exist in the tree.",
      command: `traverse("${slug}")`,
    });
  }

  return renderOgCard({
    kicker: KIND_TAG[entity.kind],
    title: entity.label,
    subtitle: truncate(entity.summary, MAX_SUBTITLE),
    command: `traverse("${entity.id}")`,
  });
}
