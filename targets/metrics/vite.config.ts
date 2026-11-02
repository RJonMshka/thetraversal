import { fileURLToPath } from "node:url";
import { tvTarget } from "@tv/target-kit/vite";
import { defineConfig } from "vite";
import pkg from "./package.json" with { type: "json" };
import target from "./target.config";

// Base path, output folder, federation entry and manifest come from
// tvTarget (LLD-04 §3). Port 5103. Preact through Vite's own JSX
// transform, no plugin.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  oxc: { jsx: { runtime: "automatic", importSource: "preact" } },
  plugins: [...tvTarget({ target, version: pkg.version, mount: "./src/mount.tsx" })],
});
