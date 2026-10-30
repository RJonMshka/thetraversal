import { describe, expect, it } from "vitest";
import { unwrapPropertyFallback } from "@/styles";

describe("unwrapPropertyFallback", () => {
  it("makes Tailwind's @property fallback apply in every browser", () => {
    const css =
      "@layer properties{@supports (((-webkit-hyphens:none)) and (not (margin-trim:inline))) or ((-moz-orient:inline) and (not (color:rgb(from red r g b)))){*,:before{--tw-border-style:solid}}}" +
      "@supports (color:lab(0% 0 0)){.a{color:red}}";
    const out = unwrapPropertyFallback(css);
    expect(out).toContain("@supports (display: block) {*,:before{--tw-border-style:solid}}");
    expect(out).toContain("@supports (color:lab(0% 0 0))");
  });
});
