import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@tv/ir", "@tv/tokens"],
};

export default nextConfig;
