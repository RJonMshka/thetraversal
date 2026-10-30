import { CONTRACT_VERSION, parseManifest } from "@tv/contract";
import { describe, expect, it } from "vitest";
import { defineTarget, remoteName, targetBase, toManifest } from "../config";

const target = defineTarget({
  id: "three",
  label: "Three",
  flag: "--target=three",
  description: "the portfolio as a 3D space",
  ir: ">=1.0.0 <2.0.0",
  capabilities: ["webgl2"],
  budget: { jsKbGz: 200 },
  urlParams: [],
  a11y: "partial",
  motion: "static-fallback",
});

describe("toManifest", () => {
  it("adds what the build owns and passes the shell's validation", () => {
    const manifest = toManifest(target, "1.2.3");
    expect(manifest).toMatchObject({
      version: "1.2.3",
      contract: CONTRACT_VERSION,
      entry: { kind: "mf", remote: "tv_three", expose: "./mount", url: "remoteEntry.js" },
      isolation: "shadow",
    });
    expect(parseManifest(JSON.parse(JSON.stringify(manifest)))).toEqual(manifest);
  });

  it("names remotes and paths by id", () => {
    expect(remoteName("ast")).toBe("tv_ast");
    expect(targetBase("ast")).toBe("/_t/ast/");
  });
});
