import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { federation } from "@module-federation/vite";
import type { Plugin, UserConfig } from "vite";
import { REMOTE_ENTRY, TARGET_PORTS, remoteName, targetBase, toManifest, type TargetConfig } from "./config";

// ── Target build (LLD-04 §3) ───────────────────────────────────────────
// One plugin set per target. It owns the parts every target must get
// right the same way: the /_t/<id>/ base, the federation entry, nothing
// shared (ADR-8), manifest.json next to the remote entry, and the
// standalone harness (`vite --mode standalone`, LLD-04 §9).

export interface TvTargetOptions {
  target: TargetConfig;
  /** Target's own semver, usually its package.json version. */
  version: string;
  /** Module whose default export is the TargetModule. Relative to the Vite root. */
  mount?: string;
}

const HARNESS_ID = "virtual:tv-harness";
// A remote has no index.html; the build starts from an empty module and
// federation emits remoteEntry.js and the exposed chunks next to it.
const NOOP_ID = "virtual:tv-noop";
const RESOLVED_NOOP_ID = "\0" + NOOP_ID;
const RESOLVED_HARNESS_ID = "\0" + HARNESS_ID;
const require = createRequire(import.meta.url);

/** The IR compiler's output, served to the harness as the shell would. */
function irDist(): string {
  return path.join(path.dirname(require.resolve("@tv/ir/package.json")), "dist");
}

function manifestPlugin(opts: TvTargetOptions): Plugin {
  const json = () => JSON.stringify(toManifest(opts.target, opts.version), null, 2) + "\n";
  const url = `${targetBase(opts.target.id)}manifest.json`;
  return {
    name: "tv:manifest",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "manifest.json", source: json() });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== url) return next();
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache");
        res.end(json());
      });
    },
  };
}

function harnessPlugin(opts: TvTargetOptions): Plugin {
  const base = targetBase(opts.target.id);
  let root = process.cwd();
  return {
    name: "tv:harness",
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      return id === HARNESS_ID ? RESOLVED_HARNESS_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_HARNESS_ID) return;
      const mount = path.resolve(root, opts.mount ?? "src/mount.tsx");
      const manifest = toManifest(opts.target, opts.version);
      return [
        `import "@tv/tokens/tokens.css";`,
        `import { startHarness } from "@tv/target-kit/harness";`,
        `import target from ${JSON.stringify(mount)};`,
        `startHarness({ manifest: ${JSON.stringify(manifest)}, load: async () => target });`,
      ].join("\n");
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        // Entity bodies, as the shell serves them from public/ir/v1.
        if (url.startsWith("/__tv/ir/")) {
          const file = path.join(irDist(), url.slice("/__tv/ir/".length));
          if (!file.startsWith(irDist())) return next();
          try {
            res.setHeader("Content-Type", "application/json");
            res.end(readFileSync(file));
          } catch {
            res.statusCode = 404;
            res.end();
          }
          return;
        }
        if (url !== "/" && url !== base && url !== `${base}index.html`) return next();
        const html = await server.transformIndexHtml(base, HARNESS_HTML(opts.target.label));
        res.setHeader("Content-Type", "text/html");
        res.end(html);
      });
    },
  };
}

const HARNESS_HTML = (label: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${label} · target harness</title>
  </head>
  <body>
    <script type="module">import "${HARNESS_ID}";</script>
  </body>
</html>
`;

/**
 * Vite plugins for a target. `vite build` emits the federated remote
 * under dist/_t/<id>/; `vite --mode standalone` serves the harness.
 */
export function tvTarget(opts: TvTargetOptions): Plugin[] {
  const { id } = opts.target;
  const base = targetBase(id);
  const port = TARGET_PORTS[id];

  const configPlugin: Plugin = {
    name: "tv:config",
    resolveId(source) {
      return source === NOOP_ID ? RESOLVED_NOOP_ID : undefined;
    },
    load(source) {
      return source === RESOLVED_NOOP_ID ? "export {};" : undefined;
    },
    config(_config, env): UserConfig {
      return {
        // Chunk URLs resolve under the shell's same-origin rewrite.
        base,
        build: {
          target: "es2022",
          // Deployed as-is: the path is identical on the target's own
          // domain and through the shell (LLD-04 §4).
          outDir: `dist${base}`.replace(/\/$/, ""),
          emptyOutDir: true,
          modulePreload: false,
          rollupOptions: { input: { "tv-noop": NOOP_ID } },
        },
        server: { port, strictPort: true, cors: true, open: env.mode === "standalone" ? base : false },
        preview: { port, strictPort: true, cors: true },
      };
    },
  };

  const notStandalone = (plugin: Plugin): Plugin => {
    const apply = plugin.apply;
    return {
      ...plugin,
      apply: (config, env) => {
        if (env.mode === "standalone") return false;
        if (typeof apply === "function") return apply(config, env);
        return apply === undefined || apply === env.command;
      },
    };
  };
  const onlyStandalone = (plugin: Plugin): Plugin => ({
    ...plugin,
    apply: (_config, env) => env.mode === "standalone" && env.command === "serve",
  });

  const remote = (federation({
      name: remoteName(id),
      filename: REMOTE_ENTRY,
      manifest: true,
      exposes: { "./mount": opts.mount ?? "./src/mount.tsx" },
      // ADR-8: nothing shared in v1; each target bundles its own framework.
      shared: {},
      dts: false,
    }) as Plugin[]).map(notStandalone);

  return [configPlugin, manifestPlugin(opts), ...remote, onlyStandalone(harnessPlugin(opts))];
}
