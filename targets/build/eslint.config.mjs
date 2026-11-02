import tseslint from "typescript-eslint";

// Lint boundary for targets (LLD-04 §8): a target reaches the shell only
// through its TargetContext.
export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "next", message: "Targets never import Next; navigate through ctx.nav." },
            { name: "@tv/shell", message: "Targets never import the shell; everything arrives through ctx." },
          ],
          patterns: [
            { group: ["next/*"], message: "Targets never import Next; navigate through ctx.nav." },
            { regex: "(^|/)apps/", message: "Targets never import from apps/." },
            { group: ["../*"], message: "Use @/ inside the target." },
          ],
        },
      ],
    },
  }
);
