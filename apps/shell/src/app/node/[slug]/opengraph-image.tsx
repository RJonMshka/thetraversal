import { getFlatNodes, findNodeBySlug } from "@/data";
import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/card";

export const alt = "The Traversal — Rajat Kumar";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getFlatNodes().map((node) => ({ slug: node.slug }));
}

const MAX_SUBTITLE = 140;

function truncate(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = findNodeBySlug(slug);

  if (!result) {
    return renderOgCard({
      kicker: "Error",
      title: "Node not found",
      subtitle: "This path does not exist in the tree.",
      command: `traverse("${slug}")`,
    });
  }

  const { node } = result;
  return renderOgCard({
    kicker: node.type,
    title: node.label,
    subtitle: truncate(node.content?.summary ?? "Rajat Kumar, senior software engineer.", MAX_SUBTITLE),
    command: `traverse("${node.slug}")`,
  });
}
