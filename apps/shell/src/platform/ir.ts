import type { Graph } from "@tv/ir";
import { createIRClient } from "@tv/ir/client";
import irGraph from "@tv/ir/dist/graph.json";
import irIndex from "@tv/ir/dist/index.json";

// ── The shell's IR (LLD-03 §5) ─────────────────────────────────────────
// One IRClient over the graph inlined at build time, shared by server
// components, shell chrome, and every target context.

// The JSON import widens enums to string. The IR compiler validated the
// graph, and the projection test re-checks it, so the client bundle does
// not carry the validator.
const graph = irGraph as unknown as Graph;

// Client code that needs a body lazily gets the hashed, immutable URL.
const bodyPaths: Record<string, string | undefined> = irIndex.bodies;

export const ir = createIRClient(graph, {
  bodyUrl: (id) => `/ir/v1/${bodyPaths[id] ?? `body/${id}.json`}`,
});
