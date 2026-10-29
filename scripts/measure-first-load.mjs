// First-load JS per route, gzipped. Next 16 (Turbopack) no longer prints this
// in `next build`, so we read the prerendered HTML and sum the scripts it loads.
// Run after `pnpm build`: node scripts/measure-first-load.mjs <path-to-.next>
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

const NEXT_DIR = path.resolve(process.argv[2] ?? ".next");
const ROUTES = {
  "/": "index.html",
  "/tree": "tree.html",
  "/node/reachble": "node/reachble.html",
  "/node/rewiring-the-interface": "node/rewiring-the-interface.html",
  "/node/timeline-0": "node/timeline-0.html",
};

const kb = (bytes) => (bytes / 1024).toFixed(1);

for (const [route, file] of Object.entries(ROUTES)) {
  const htmlPath = path.join(NEXT_DIR, "server/app", file);
  if (!existsSync(htmlPath)) {
    console.log(`${route.padEnd(32)} missing (${file})`);
    continue;
  }
  const html = readFileSync(htmlPath, "utf8");
  const srcs = new Set(
    [...html.matchAll(/\/_next\/(static\/[^"'\s]+?\.js)/g)].map((m) => m[1]),
  );
  let gz = 0;
  for (const src of srcs) {
    gz += gzipSync(readFileSync(path.join(NEXT_DIR, src))).length;
  }
  console.log(`${route.padEnd(32)} ${kb(gz).padStart(7)} KB gz  (${srcs.size} chunks)`);
}
