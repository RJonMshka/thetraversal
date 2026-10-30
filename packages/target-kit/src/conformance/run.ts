import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { parseManifest, type TargetManifest } from "@tv/contract";
import { chromium } from "playwright";
import { createServer, type Plugin } from "vite";
import type { Check } from "./page";

// ── Conformance runner (LLD-02 §7, LLD-04 §7) ──────────────────────────
// `pnpm --filter @tv/target-<id> conformance`, after `build`. Serves the
// target's dist/ next to the conformance page, loads it in Chromium
// through the MF runtime, and runs mount → setFocus(every entity) →
// unmount → mount → unmount. Exits non-zero on any failure.

const here = path.dirname(fileURLToPath(import.meta.url));

const TYPES: Record<string, string> = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function findTarget(cwd: string): { dir: string; manifest: TargetManifest } {
  const base = path.join(cwd, "dist", "_t");
  if (!existsSync(base)) throw new Error(`no build found at ${base}; run the target's build first`);
  const [id, ...rest] = readdirSync(base);
  if (!id || rest.length > 0) throw new Error(`expected exactly one target under ${base}`);
  const dir = path.join(base, id);
  const manifest = parseManifest(JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8")));
  return { dir, manifest };
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    return statSync(file).isDirectory() ? walk(file) : [file];
  });
}

/** Every JS file the target ships, gzipped (obligation 8). */
export function measureJs(dir: string): { kb: number; files: { file: string; kb: number }[] } {
  const files = walk(dir)
    .filter((f) => f.endsWith(".js") && !f.includes(`${path.sep}.vite${path.sep}`))
    .map((f) => ({ file: path.relative(dir, f), kb: gzipSync(readFileSync(f), { level: 9 }).length / 1024 }))
    .sort((a, b) => b.kb - a.kb);
  return { kb: files.reduce((sum, f) => sum + f.kb, 0), files };
}

function serveDist(id: string, dir: string): Plugin {
  const prefix = `/_t/${id}/`;
  return {
    name: "tv:serve-dist",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (!url.startsWith(prefix)) return next();
        const file = path.join(dir, decodeURIComponent(url.slice(prefix.length)));
        if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) {
          res.statusCode = 404;
          res.end();
          return;
        }
        res.setHeader("Content-Type", TYPES[path.extname(file)] ?? "application/octet-stream");
        res.end(readFileSync(file));
      });
    },
  };
}

const MARK = { pass: "✓", fail: "✗", warn: "!", manual: "·" } as const;

async function main() {
  const { dir, manifest } = findTarget(process.cwd());
  const checks: Check[] = [];

  const size = measureJs(dir);
  checks.push({
    id: "budget",
    title: `JS under budget (${manifest.budget.jsKbGz} KB gz)`,
    status: size.kb <= manifest.budget.jsKbGz ? "pass" : "fail",
    detail: `${size.kb.toFixed(1)} KB gz in ${size.files.length} files; largest ${size.files
      .slice(0, 3)
      .map((f) => `${f.file} ${f.kb.toFixed(1)}`)
      .join(", ")}`,
  });

  const server = await createServer({
    root: here,
    configFile: false,
    logLevel: "warn",
    server: { port: 0, strictPort: false },
    plugins: [serveDist(manifest.id, dir)],
  });
  await server.listen();
  const address = server.resolvedUrls?.local[0];
  if (!address) throw new Error("conformance server did not start");

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const console: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") console.push(`[${m.type()}] ${m.text()}`);
    });
    page.on("pageerror", (e) => console.push(`[pageerror] ${e.message}`));
    await page.goto(address);
    await page.waitForFunction(() => "__tvConformance" in window, null, { timeout: 30_000 });
    const report = await page.evaluate((id) => window.__tvConformance.run(id), manifest.id);
    checks.push(...report.checks);
    if (console.length > 0) {
      checks.push({ id: "console", title: "no console errors or warnings", status: "fail", detail: console.slice(0, 5).join(" | ") });
    } else {
      checks.push({ id: "console", title: "no console errors or warnings", status: "pass" });
    }
  } finally {
    await browser.close();
    await server.close();
  }

  process.stdout.write(`\nconformance: ${manifest.flag} ${manifest.version}\n\n`);
  for (const c of checks) {
    process.stdout.write(`  ${MARK[c.status]} ${c.title}${c.detail ? `\n      ${c.detail}` : ""}\n`);
  }
  const failed = checks.filter((c) => c.status === "fail").length;
  const warned = checks.filter((c) => c.status === "warn").length;
  const manual = checks.filter((c) => c.status === "manual").length;
  const passed = checks.length - failed - warned - manual;
  process.stdout.write(`\n${passed} passed, ${failed} failed, ${warned} warnings, ${manual} manual\n`);
  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch((err: unknown) => {
  process.stderr.write(`conformance: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
