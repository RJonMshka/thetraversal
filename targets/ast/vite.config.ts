import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { tvTarget } from "@tv/target-kit/vite";
import { defineConfig } from "vite";
import pkg from "./package.json" with { type: "json" };
import target from "./target.config";

// Base path, output folder, federation entry and manifest come from
// tvTarget (LLD-04 §3). Port 5101.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [react(), tailwindcss(), ...tvTarget({ target, version: pkg.version, mount: "./src/mount.tsx" })],
});
