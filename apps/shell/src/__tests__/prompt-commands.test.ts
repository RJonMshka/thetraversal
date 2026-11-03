import { describe, expect, it } from "vitest";
import { completeIR, findEntity, FLAVOR_IDS, runIRCommand } from "@/lib/prompt-commands";
import { LISTED_TARGETS } from "@/platform/registry";
import { ir } from "@/platform/ir";

describe("landing prompt: IR commands", () => {
  it("offers only listed targets as flavors", () => {
    expect(FLAVOR_IDS.length).toBeGreaterThan(0);
    for (const id of FLAVOR_IDS) expect(LISTED_TARGETS).toContain(id);
  });

  it("--target=<id> navigates to a listed target, rejects others", () => {
    const id = FLAVOR_IDS[0];
    expect(runIRCommand(`--target=${id}`)?.action).toEqual({ kind: "navigate", url: `/t/${id}` });
    expect(runIRCommand("target nope")?.action).toBeUndefined();
    expect(runIRCommand("--target=metrics")?.action).toBeUndefined();
  });

  it("ls lists the root's sections", () => {
    const out = runIRCommand("ls")?.content as string[];
    for (const s of ir.children(ir.graph.rootId)) expect(out.join("\n")).toContain(s.id);
  });

  it("cd opens a node by id, label, or unique prefix", () => {
    const first = ir.children(ir.graph.rootId)[0];
    expect(runIRCommand(`cd ${first.id}`)?.action?.url).toBe(`/node/${first.id}`);
    expect(findEntity(first.label.toUpperCase())?.id).toBe(first.id);
    expect(runIRCommand("cd no-such-node")?.action).toBeUndefined();
  });

  it("anything else falls through to the parse animation", () => {
    expect(runIRCommand("hello there")).toBeNull();
  });

  it("completes node ids and target ids", () => {
    expect(completeIR("cd ")?.items.length).toBeGreaterThan(0);
    expect(completeIR("--target=")?.items.map((i) => i.name)).toEqual(FLAVOR_IDS);
    // An exact match closes the list so Enter runs the command.
    expect(completeIR(`--target=${FLAVOR_IDS[0]}`)).toBeNull();
  });
});
