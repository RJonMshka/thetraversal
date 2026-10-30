import type { MetadataRoute } from "next";
import { entitiesByDepth } from "@/platform/ir";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://thetraversal.vercel.app";
  const allNodes = entitiesByDepth();

  const nodePages: MetadataRoute.Sitemap = allNodes.map((node) => ({
    url: `${baseUrl}/node/${node.id}`,
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
      url: `${baseUrl}/t/ast`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...nodePages,
  ];
}
