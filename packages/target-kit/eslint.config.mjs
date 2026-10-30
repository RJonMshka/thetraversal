import tseslint from "typescript-eslint";

// Lint boundary for packages (LLD-04 §8). The harness is plain DOM, so
// target-kit does not use the React exception either.
export default tseslint.config(
  { ignores: ["node_modules/**"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "Packages are framework-free." },
            { name: "next", message: "Packages never import Next." },
          ],
          patterns: [
            { group: ["next/*", "react-dom", "react-dom/*"], message: "Packages are framework-free." },
            { regex: "(^|/)(apps|targets)/", message: "Packages never import apps or targets." },
          ],
        },
      ],
    },
  }
);
