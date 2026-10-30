import { describe, expect, it } from "vitest";
import { ManifestError, parseManifest } from "../index";

const valid = {
  id: "ast",
  label: "AST",
  flag: "--target=ast",
  description: "the portfolio as a syntax tree",
  version: "1.0.0",
  contract: 1,
  ir: ">=1.0.0 <2.0.0",
  entry: { kind: "mf", remote: "tv_ast", expose: "./mount", url: "mf-manifest.json" },
  capabilities: [],
  budget: { jsKbGz: 150 },
  urlParams: ["mode"],
  a11y: "full",
  motion: "reduced-variant",
  isolation: "shadow",
};

describe("parseManifest", () => {
  it("accepts a valid manifest and drops unknown keys", () => {
    expect(parseManifest({ ...valid, extra: true })).toEqual(valid);
  });

  it("parses another contract version so the shell can report T0001", () => {
    expect(parseManifest({ ...valid, contract: 2 }).contract).toBe(2);
  });

  it.each([
    ["id", { ...valid, id: "" }],
    ["entry.kind", { ...valid, entry: { ...valid.entry, kind: "iframe" } }],
    ["entry.url", { ...valid, entry: { ...valid.entry, url: 3 } }],
    ["capabilities", { ...valid, capabilities: ["telepathy"] }],
    ["budget.jsKbGz", { ...valid, budget: { jsKbGz: 0 } }],
    ["urlParams", { ...valid, urlParams: "mode" }],
    ["a11y", { ...valid, a11y: "some" }],
    ["isolation", { ...valid, isolation: "iframe" }],
    ["contract", { ...valid, contract: "1" }],
  ])("rejects a bad %s", (path, input) => {
    expect(() => parseManifest(input)).toThrow(ManifestError);
    expect(() => parseManifest(input)).toThrow(`manifest.${path}`);
  });

  it("rejects non-objects", () => {
    expect(() => parseManifest(null)).toThrow(ManifestError);
    expect(() => parseManifest([])).toThrow(ManifestError);
  });
});
