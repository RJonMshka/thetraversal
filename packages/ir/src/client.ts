import type { Body, Entity, Graph, Kind, Rel } from "./schema";

// ── IRClient (LLD-01 §6) ───────────────────────────────────────────────
// Read-only view over a Graph. Indexes are built once; bodies are fetched
// lazily, cached, and deduplicated across callers.

export interface IRClient {
  readonly graph: Graph;
  readonly version: { schema: string; content: string };
  entity(id: string): Entity | undefined;
  children(id: string): Entity[]; // ordered contains children
  parent(id: string): Entity | undefined;
  path(id: string): Entity[]; // root → id
  related(id: string, rel?: Rel): { entity: Entity; rel: Rel; dir: "out" | "in" }[];
  byKind(kind: Kind): Entity[];
  walk(visit: (e: Entity, depth: number) => void | "skip"): void; // DFS in contains order
  body(id: string, signal?: AbortSignal): Promise<Body | null>; // cached, deduped
}

export interface IRClientOptions {
  bodyUrl: (id: string) => string;
  /** Defaults to globalThis.fetch. */
  fetch?: typeof globalThis.fetch;
}

export function createIRClient(graph: Graph, opts: IRClientOptions): IRClient {
  const childrenOf = new Map<string, string[]>();
  const parentOf = new Map<string, string>();
  const adjacency = new Map<string, { other: string; rel: Rel; dir: "out" | "in" }[]>();
  const kindIndex = new Map<Kind, Entity[]>();

  const containsEdges = graph.edges
    .filter((e) => e.rel === "contains")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const edge of containsEdges) {
    const list = childrenOf.get(edge.from) ?? [];
    list.push(edge.to);
    childrenOf.set(edge.from, list);
    parentOf.set(edge.to, edge.from);
  }

  for (const edge of graph.edges) {
    if (edge.rel === "contains") continue;
    const out = adjacency.get(edge.from) ?? [];
    out.push({ other: edge.to, rel: edge.rel, dir: "out" });
    adjacency.set(edge.from, out);
    const inc = adjacency.get(edge.to) ?? [];
    inc.push({ other: edge.from, rel: edge.rel, dir: "in" });
    adjacency.set(edge.to, inc);
  }

  for (const entity of Object.values(graph.entities)) {
    const list = kindIndex.get(entity.kind) ?? [];
    list.push(entity);
    kindIndex.set(entity.kind, list);
  }

  const entity = (id: string) => graph.entities[id];
  const resolve = (ids: string[]) =>
    ids.map((id) => graph.entities[id]).filter((e): e is Entity => e !== undefined);

  const bodyCache = new Map<string, Promise<Body | null>>();
  const doFetch = opts.fetch ?? globalThis.fetch;

  return {
    graph,
    version: { schema: graph.schemaVersion, content: graph.contentHash },
    entity,
    children: (id) => resolve(childrenOf.get(id) ?? []),
    parent: (id) => {
      const p = parentOf.get(id);
      return p === undefined ? undefined : entity(p);
    },
    path: (id) => {
      if (!entity(id)) return [];
      const ids: string[] = [];
      for (let cur: string | undefined = id; cur !== undefined; cur = parentOf.get(cur)) {
        ids.unshift(cur);
      }
      return resolve(ids);
    },
    related: (id, rel) =>
      (adjacency.get(id) ?? [])
        .filter((a) => rel === undefined || a.rel === rel)
        .flatMap((a) => {
          const other = entity(a.other);
          return other ? [{ entity: other, rel: a.rel, dir: a.dir }] : [];
        }),
    byKind: (kind) => kindIndex.get(kind) ?? [],
    walk: (visit) => {
      const step = (id: string, depth: number) => {
        const e = entity(id);
        if (!e) return;
        if (visit(e, depth) === "skip") return;
        for (const child of childrenOf.get(id) ?? []) step(child, depth + 1);
      };
      step(graph.rootId, 0);
    },
    body: (id, signal) => {
      const cached = bodyCache.get(id);
      if (cached) return cached;
      // The shared request is not tied to one caller's signal; an aborted
      // caller just stops waiting.
      const request = doFetch(opts.bodyUrl(id))
        .then((res) => (res.ok ? (res.json() as Promise<Body>) : null))
        .catch(() => {
          bodyCache.delete(id);
          return null;
        });
      bodyCache.set(id, request);
      if (!signal) return request;
      return new Promise<Body | null>((resolvePromise, reject) => {
        if (signal.aborted) return reject(signal.reason);
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        request.then(resolvePromise, reject);
      });
    },
  };
}
