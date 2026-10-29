import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { IRIndex } from "../schema";
import { shortHash, type CompileResult, type MdxSources, type Registry } from "./build";

// ── Compiler IO (LLD-01 §5) ────────────────────────────────────────────

export async function loadRegistry(contentDir: string): Promise<Registry> {
  const mod = (await import(pathToFileURL(path.join(contentDir, "registry", "index.ts")).href)) as {
    REGISTRY: Registry;
  };
  return mod.REGISTRY;
}

async function readMdxDir(dir: string): Promise<Map<string, string>> {
  const files = (await readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith(".mdx")).sort();
  const entries = await Promise.all(
    files.map(async (f) => [f.slice(0, -4), await readFile(path.join(dir, f), "utf-8")] as const)
  );
  return new Map(entries);
}

export async function loadMdx(contentDir: string): Promise<MdxSources> {
  return {
    nodes: await readMdxDir(path.join(contentDir, "mdx", "nodes")),
    essays: await readMdxDir(path.join(contentDir, "mdx", "essays")),
  };
}

/**
 * Writes the package's own dist (graph + bodies imported at build time)
 * and the shell-served tree under <publicDir>:
 *   graph.json, graph.<hash>.json, body/<id>.<hash>.json, index.json
 */
export async function emit(result: CompileResult, dirs: { distDir: string; publicDir: string }): Promise<IRIndex> {
  const { graph, bodies } = result;
  const graphJson = JSON.stringify(graph);
  const index: IRIndex = {
    schemaVersion: graph.schemaVersion,
    contentHash: graph.contentHash,
    graph: `graph.${graph.contentHash}.json`,
    bodies: {},
  };

  await rm(dirs.publicDir, { recursive: true, force: true });
  await rm(dirs.distDir, { recursive: true, force: true });
  await mkdir(path.join(dirs.publicDir, "body"), { recursive: true });
  await mkdir(path.join(dirs.distDir, "body"), { recursive: true });

  for (const body of bodies) {
    const json = JSON.stringify(body);
    const rel = `body/${body.id}.${shortHash(json)}.json`;
    index.bodies[body.id] = rel;
    await writeFile(path.join(dirs.publicDir, rel), json);
    await writeFile(path.join(dirs.distDir, "body", `${body.id}.json`), json);
  }
  const indexJson = JSON.stringify(index);

  await writeFile(path.join(dirs.publicDir, "graph.json"), graphJson);
  await writeFile(path.join(dirs.publicDir, index.graph), graphJson);
  await writeFile(path.join(dirs.publicDir, "index.json"), indexJson);
  await writeFile(path.join(dirs.distDir, "graph.json"), graphJson);
  await writeFile(path.join(dirs.distDir, "index.json"), indexJson);
  return index;
}
