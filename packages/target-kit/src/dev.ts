import { build, preview } from "vite";

// ── Target dev server for the shell (LLD-04 §9) ────────────────────────
// `pnpm dev` runs this in every target: a watch build plus a static
// server on the target's port. The shell loads a real federated build
// through its /_t/<id>/ rewrite, rebuilt on every change. Vite's own dev
// server is not used here: its React refresh preamble lives in the host
// page, and the host is Next. For hot reload, use `dev:standalone`.

async function main() {
  await build({ configLoader: "runner", mode: "development", build: { watch: {} } });
  const server = await preview({ configLoader: "runner", mode: "development" });
  server.printUrls();
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
  process.exitCode = 1;
});
