import { fileURLToPath } from "node:url";
import { tvTarget } from "@tv/target-kit/vite";
import { defineConfig } from "vite";
import pkg from "./package.json" with { type: "json" };
import target from "./target.config";

// Base path, output folder, federation entry and manifest come from
// tvTarget (LLD-04 §3). Port 5106. No framework, no dependencies: the
// subject is the DOM and CSS, so the target is written in them directly.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [...tvTarget({ target, version: pkg.version, mount: "./src/mount.ts" })],
});
