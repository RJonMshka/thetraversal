import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    // eslint-plugin-react 7.x auto-detection calls an API removed in ESLint 10.
    settings: { react: { version: "19.2" } },
  },
  {
    ignores: [".next/**", "node_modules/**", "test-results/**", "playwright-report/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
