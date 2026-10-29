import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { compileIR, IRBuildError } from "./build";
import { emit, loadMdx, loadRegistry } from "./io";

// `pnpm --filter @tv/ir build`: content/ → dist/ + apps/shell/public/ir/v1/

const pkgDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const repoDir = path.resolve(pkgDir, "..", "..");
const contentDir = path.join(repoDir, "content");
const distDir = path.join(pkgDir, "dist");
const publicDir = path.join(repoDir, "apps", "shell", "public", "ir", "v1");

try {
  const result = await compileIR(await loadRegistry(contentDir), await loadMdx(contentDir));
  for (const w of result.warnings) console.warn(`warn  ${w}`);
  const index = await emit(result, { distDir, publicDir });
  const gzKb = (gzipSync(JSON.stringify(result.graph)).length / 1024).toFixed(1);
  console.log(
    `@tv/ir ${index.contentHash}: ${Object.keys(result.graph.entities).length} entities, ` +
      `${result.graph.edges.length} edges, ${result.bodies.length} bodies, graph ${gzKb} KB gz`
  );
} catch (err) {
  console.error(err instanceof IRBuildError ? err.message : err);
  process.exit(1);
}
