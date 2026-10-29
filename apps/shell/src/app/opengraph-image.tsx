import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/card";

export const alt = "The Traversal — Rajat Kumar";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgCard({
    kicker: "RootNode",
    title: "Rajat Kumar",
    subtitle: "Senior software engineer. A portfolio structured as a traversable abstract syntax tree.",
    command: "traverse(portfolio)",
  });
}
