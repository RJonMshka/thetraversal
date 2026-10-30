// First-load JS per route, gzipped. Next 16 (Turbopack) no longer prints this
// in `next build`, so we read the prerendered HTML and sum the scripts it loads.
// Run after `pnpm build`: node scripts/measure-first-load.mjs <path-to-.next> [--enforce]
//
// Budget (CLAUDE.md §8): per route, total ≤ 185 KB gz and shell app code
// ≤ 35 KB gz on top of the framework. "Framework" is what Next loads for
// its near-empty /_not-found page (React DOM, the Next runtime, layout).
// With --enforce, exits 1 when a route is over either limit.
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

const BUDGET = { totalKb: 185, appKb: 35 };

const args = process.argv.slice(2);
const enforce = args.includes("--enforce");
const NEXT_DIR = path.resolve(args.find((a) => !a.startsWith("--")) ?? ".next");
const ROUTES = {
  "/": "index.html",
  "/t/ast": "t/ast.html",
  "/node/reachble": "node/reachble.html",
  "/node/rewiring-the-interface": "node/rewiring-the-interface.html",
  "/node/timeline-0": "node/timeline-0.html",
};
const FRAMEWORK_PAGE = "_not-found.html";

const kb = (bytes) => (bytes / 1024).toFixed(1);

function scripts(file) {
  const html = readFileSync(path.join(NEXT_DIR, "server/app", file), "utf8");
  // Legacy polyfills load only in browsers without module support, so
  // modern browsers never download them; they are not first-load JS.
  const noModule = new Set(
    [...html.matchAll(/<script[^>]*src="\/_next\/(static\/[^"]+?\.js)"[^>]*noModule[^>]*>/gi)].map((m) => m[1]),
  );
  return new Set(
    [...html.matchAll(/\/_next\/(static\/[^"'\s]+?\.js)/g)].map((m) => m[1]).filter((src) => !noModule.has(src)),
  );
}

const gzBytes = (srcs) => [...srcs].reduce((sum, src) => sum + gzipSync(readFileSync(path.join(NEXT_DIR, src))).length, 0);

const framework = scripts(FRAMEWORK_PAGE);
console.log(`framework (/_not-found)          ${kb(gzBytes(framework)).padStart(7)} KB gz`);
console.log(`budget: total ≤ ${BUDGET.totalKb} KB, app ≤ ${BUDGET.appKb} KB\n`);

let over = 0;
for (const [route, file] of Object.entries(ROUTES)) {
  if (!existsSync(path.join(NEXT_DIR, "server/app", file))) {
    console.log(`${route.padEnd(32)} missing (${file})`);
    continue;
  }
  const srcs = scripts(file);
  const total = gzBytes(srcs);
  const app = gzBytes([...srcs].filter((src) => !framework.has(src)));
  const bad = total / 1024 > BUDGET.totalKb || app / 1024 > BUDGET.appKb;
  if (bad) over += 1;
  console.log(
    `${route.padEnd(32)} ${kb(total).padStart(7)} KB gz  app ${kb(app).padStart(5)} KB  (${srcs.size} chunks)${bad ? "  OVER BUDGET" : ""}`,
  );
}

if (enforce && over > 0) {
  console.error(`\n${over} route(s) over the first-load budget`);
  process.exitCode = 1;
}
