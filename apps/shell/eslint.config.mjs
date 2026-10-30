import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    // eslint-plugin-react 7.x auto-detection calls an API removed in ESLint 10.
    settings: { react: { version: "19.2" } },
  },
  {
    // Shell platform code knows targets by id only (LLD-04 §8).
    files: ["src/platform/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@tv/target-*"], message: "Shell platform code knows targets by id only." },
            { regex: "(^|/)targets/", message: "Shell platform code knows targets by id only." },
          ],
        },
      ],
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "test-results/**", "playwright-report/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
