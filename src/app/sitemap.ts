import type { MetadataRoute } from "next";
import { getFlatNodes } from "@/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://thetraversal.dev";
  const allNodes = getFlatNodes();

  const nodePages: MetadataRoute.Sitemap = allNodes.map((node) => ({
    url: `${baseUrl}/node/${node.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: node.depth === 0 ? 0.8 : node.depth === 1 ? 0.7 : 0.6,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}/tree`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...nodePages,
  ];
}
