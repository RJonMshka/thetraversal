import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    // eslint-plugin-react 7.x auto-detection calls an API removed in ESLint 10.
    settings: { react: { version: "19.2" } },
  },
  {
    // Phase 3 boundary (LLD-04 §8): the AST reaches the shell only through
    // its TargetContext, so it can leave for targets/ast in Phase 4.
    files: ["src/targets/ast/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "next", message: "Targets never import Next; navigate through ctx.nav." }],
          patterns: [
            { group: ["next/*"], message: "Targets never import Next; navigate through ctx.nav." },
            {
              regex: "^@/(?!targets/ast/)",
              message: "The AST imports nothing from the shell; everything arrives through ctx.",
            },
          ],
        },
      ],
    },
  },
  {
    // Shell platform code knows targets by id only. The in-bundle loader
    // is the Phase 3 exception: it is how a local target is reached.
    files: ["src/platform/**/*.{ts,tsx}"],
    ignores: ["src/platform/loader/local.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ regex: "^@/targets/", message: "Shell platform code knows targets by id only." }] },
      ],
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "test-results/**", "playwright-report/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
