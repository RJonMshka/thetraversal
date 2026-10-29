import { describe, expect, it } from "vitest";
import { compileIR, IRBuildError, type Registry } from "../compiler/build";
import { createIRClient } from "../client";
import { essayBodyId } from "../schema";

const base = (over: Partial<Registry> = {}): Registry => ({
  rootId: "root",
  entities: [
    { id: "root", kind: "root", label: "Root", children: ["work", "notes"] },
    { id: "work", kind: "section", label: "Work", children: ["alpha", "beta", "gamma"] },
    { id: "alpha", kind: "project", label: "Alpha", stack: ["TS"], links: [{ label: "Repo", url: "https://x.dev/a" }] },
    { id: "beta", kind: "project", label: "Beta", status: "draft" },
    { id: "gamma", kind: "paper", label: "Gamma", essayRef: "gamma" },
    { id: "notes", kind: "skill-cluster", label: "Notes", children: ["typescript"] },
    { id: "typescript", kind: "skill", label: "TypeScript" },
  ],
  relations: [
    { from: "alpha", to: "gamma", rel: "implements" },
    { from: "beta", to: "gamma", rel: "implements" },
  ],
  stackAliases: { ts: "TypeScript" },
  ...over,
});

const mdx = {
  nodes: new Map([
    ["alpha", '---\nsummary: ""\n---\n\nFirst not_affected para.\n\nSecond.\n'],
    ["beta", "Draft body."],
  ]),
  essays: new Map([["gamma", "## Intro\n\n```ts\nconst x = 1;\n```\n\n[ext](https://example.com)\n"]]),
};

describe("compileIR", () => {
  it("drops drafts, builds ordered edges, derives uses, compiles bodies", async () => {
    const { graph, bodies, warnings } = await compileIR(base(), mdx, { builtAt: "t" });

    expect(Object.keys(graph.entities)).not.toContain("beta");
    expect(graph.edges.filter((e) => e.rel === "contains" && e.from === "work")).toEqual([
      { from: "work", to: "alpha", rel: "contains", order: 0 },
      { from: "work", to: "gamma", rel: "contains", order: 1 },
    ]);
    expect(graph.edges).toContainEqual({ from: "alpha", to: "gamma", rel: "implements" });
    expect(graph.edges).toContainEqual({ from: "alpha", to: "typescript", rel: "uses" });
    expect(warnings.some((w) => w.includes("beta implements gamma dropped"))).toBe(true);
    expect(warnings.some((w) => w.includes("nodes/beta.mdx"))).toBe(true);

    expect(graph.entities.alpha.hasBody).toBe(true);
    const alpha = bodies.find((b) => b.id === "alpha")!;
    expect(alpha.html).toBe("<p>First not_affected para.</p>\n<p>Second.</p>");

    const essay = bodies.find((b) => b.id === essayBodyId("gamma"))!;
    expect(essay.toc).toEqual([{ id: "intro", text: "Intro", depth: 2 }]);
    expect(essay.html).toContain('<h2 id="intro">');
    expect(essay.html).toContain("<span style=");
    expect(essay.html).toContain('target="_blank"');
  });

  it("hash ignores builtAt and changes with content", async () => {
    const a = await compileIR(base(), mdx, { builtAt: "1" });
    const b = await compileIR(base(), mdx, { builtAt: "2" });
    expect(a.graph.contentHash).toBe(b.graph.contentHash);
    const changed = base();
    (changed.entities[2] as { label: string }).label = "Alpha 2";
    const c = await compileIR(changed, mdx);
    expect(c.graph.contentHash).not.toBe(a.graph.contentHash);
  });

  it.each([
    ["duplicate id", { entities: [...base().entities, { id: "alpha", kind: "project", label: "A" }] }],
    ["unknown child", { entities: [{ id: "root", kind: "root", label: "R", children: ["nope"] }] }],
    ["two parents", { entities: [
      { id: "root", kind: "root", label: "R", children: ["a", "b"] },
      { id: "a", kind: "section", label: "A", children: ["b"] },
      { id: "b", kind: "section", label: "B" },
    ] }],
    ["unreachable", { entities: [{ id: "root", kind: "root", label: "R" }, { id: "lost", kind: "skill", label: "L" }] }],
    ["missing essay", { entities: [{ id: "root", kind: "root", label: "R", essayRef: "missing" }] }],
    ["bad link", { entities: [{ id: "root", kind: "root", label: "R", links: [{ label: "x", url: "javascript:1" }] }] }],
  ] as const)("fails on %s", async (_name, over) => {
    await expect(compileIR(base(over as Partial<Registry>), mdx)).rejects.toBeInstanceOf(IRBuildError);
  });

  it("fails over budget", async () => {
    await expect(compileIR(base(), mdx, { budgetKbGz: 0.01 })).rejects.toThrow(/budget/);
  });
});

describe("createIRClient", () => {
  it("navigates the graph and dedupes body requests", async () => {
    const { graph } = await compileIR(base(), mdx);
    let calls = 0;
    const ir = createIRClient(graph, {
      bodyUrl: (id) => `/b/${id}`,
      fetch: async () => {
        calls++;
        return new Response(JSON.stringify({ id: "alpha", html: "", toc: [], readingMinutes: 1 }));
      },
    });
    expect(ir.children("work").map((e) => e.id)).toEqual(["alpha", "gamma"]);
    expect(ir.parent("alpha")?.id).toBe("work");
    expect(ir.path("alpha").map((e) => e.id)).toEqual(["root", "work", "alpha"]);
    expect(ir.related("gamma", "implements")).toEqual([
      { entity: graph.entities.alpha, rel: "implements", dir: "in" },
    ]);
    expect(ir.byKind("project").map((e) => e.id)).toEqual(["alpha"]);
    const order: string[] = [];
    ir.walk((e) => (order.push(e.id), e.id === "work" ? "skip" : undefined));
    expect(order).toEqual(["root", "work", "notes", "typescript"]);
    const [a, b] = await Promise.all([ir.body("alpha"), ir.body("alpha")]);
    expect(a).toBe(b);
    expect(calls).toBe(1);
  });
});
