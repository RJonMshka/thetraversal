import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@tv/contract", "@tv/ir", "@tv/tokens"],

  // The AST moved to /t/ast in Phase 3; old links keep working (308,
  // query string preserved).
  async redirects() {
    return [{ source: "/tree", destination: "/t/ast", permanent: true }];
  },
};

export default nextConfig;
