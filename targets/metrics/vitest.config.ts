import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests run without the federation build.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  oxc: { jsx: { runtime: "automatic", importSource: "preact" } },
  test: { globals: true },
});
