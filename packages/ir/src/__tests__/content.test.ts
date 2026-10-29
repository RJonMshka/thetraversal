import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { compileIR, type CompileResult, type Registry } from "../compiler/build";
import { loadMdx, loadRegistry } from "../compiler/io";
import type { SourceEntity } from "../schema";

// Checks on the real content/ tree, not fixtures.

const contentDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../content");

let registry: Registry;
let result: CompileResult;

beforeAll(async () => {
  registry = await loadRegistry(contentDir);
  result = await compileIR(registry, await loadMdx(contentDir));
}, 30_000);

const sources = () => registry.entities as SourceEntity[];

describe("content", () => {
  // CONTENT-v2 §0: an unpublished project must not render, link, or appear
  // anywhere in the graph, including as a stale id someone can deep-link to.
  it("no draft reaches the graph", () => {
    const drafts = sources().filter((e) => e.status === "draft").map((e) => e.id);
    expect(drafts.length).toBeGreaterThan(0);
    const ids = new Set(Object.keys(result.graph.entities));
    const edgeIds = new Set(result.graph.edges.flatMap((e) => [e.from, e.to]));
    expect(drafts.filter((id) => ids.has(id) || edgeIds.has(id))).toEqual([]);
  });

  it("every published project links to a public artifact", () => {
    const published = Object.values(result.graph.entities).filter((e) => e.kind === "project");
    expect(published.length).toBeGreaterThan(0);
    for (const project of published) {
      expect(project.links.length, project.id).toBeGreaterThan(0);
      for (const link of project.links) expect(link.url).toMatch(/^https:\/\//);
    }
  });

  it("every published project is listed in the projects section", () => {
    const section = sources().find((e) => e.id === "projects");
    const projects = sources().filter((e) => e.kind === "project").map((e) => e.id);
    expect(section?.children).toEqual(projects);
  });
});
