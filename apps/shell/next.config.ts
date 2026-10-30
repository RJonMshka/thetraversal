import type { NextConfig } from "next";
import { TARGETS } from "./src/platform/registry";

// Where each target is deployed (LLD-04 §4). Set TARGET_<ID>_ORIGIN per
// environment; local dev and builds default to the target's dev port.
const DEV_PORTS: Record<string, number> = { ast: 5101, three: 5102, metrics: 5103, art: 5104, llm: 5105 };

function targetOrigin(id: string): string {
  const fromEnv = process.env[`TARGET_${id.toUpperCase()}_ORIGIN`];
  return (fromEnv ?? `http://localhost:${DEV_PORTS[id]}`).replace(/\/$/, "");
}

// LLD-04 §6. Report-only for now: violations show in the console (an
// ingest endpoint arrives with telemetry in Phase 6). Same-origin target
// rewrites keep script-src 'self' enough for every target.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@tv/contract", "@tv/ir", "@tv/tokens"],

  // Targets are served same-origin under /_t/<id>/, at the same path as
  // on their own deployment, so script-src 'self' covers them.
  async rewrites() {
    return TARGETS.map(({ id }) => ({
      source: `/_t/${id}/:path*`,
      destination: `${targetOrigin(id)}/_t/${id}/:path*`,
    }));
  },

  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Content-Security-Policy-Report-Only", value: CSP }] }];
  },

  // The AST moved to /t/ast in Phase 3; old links keep working (308,
  // query string preserved).
  async redirects() {
    return [{ source: "/tree", destination: "/t/ast", permanent: true }];
  },
};

export default nextConfig;
