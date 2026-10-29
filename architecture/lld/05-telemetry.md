# LLD-05: Telemetry and the Metrics Target

The `metrics` target visualizes how the platform itself performs for real visitors: how long each target takes to load, how fast switches are, what fails. The shell is the instrumented system; the dashboard is a target like any other.

## 1. Events

All events share: `ts`, `sid` (session hash), `target` (active target id or null), `targetVersion`, `shellVersion`, `contentHash`, `device` (`desktop | mobile | tablet`), `conn` (`effectiveType` or `unknown`).

| Event | Props | Emitted by |
|---|---|---|
| `ir_ready` | `bytes`, `ms` (navigation start to IRClient ready) | shell |
| `target_load` | `id`, `manifestMs`, `entryMs`, `mountMs`, `readyMs`, `totalMs`, `cache` (`warm-slot` / `prefetched` / `cold`), `outcome` (`ok` / code) | shell |
| `target_switch` | `from`, `to`, `ms` (input to visible), `vt` (view transition used) | shell |
| `target_error` | `id`, `code`, `phase`, `msgHash` | shell |
| `vital` | `name` (`LCP` / `INP` / `CLS` / `TTFB`), `value`, `route` | shell, via `web-vitals` attribution build |
| `t.<id>.<name>` | free-form, max 8 props | target via `ctx.telemetry.event` |

No free-text error messages leave the browser; only a hash of the message and the error code.

## 2. Client pipeline

```
shell + targets ─▶ in-memory ring buffer (200 events)
                    ├─▶ bus-local subscribers (metrics target "this session" panel)
                    └─▶ batcher: flush every 10 s, on visibilitychange=hidden, or at 20 events
                          └─▶ navigator.sendBeacon("/api/t", JSON)  (fetch keepalive fallback)
```

- Sampling: 100% while traffic is low. A `TELEMETRY_SAMPLE` env read at build time allows dropping later.
- Respect `navigator.globalPrivacyControl` and `doNotTrack`: if set, keep the in-memory buffer (so the dashboard still shows the visitor their own session) but never send.
- `sid`: `sha256(random per-tab id + YYYY-MM-DD)`, first 16 chars. Not linkable across days.

## 3. Ingest

`apps/shell/src/app/api/t/route.ts` (Node runtime):

1. Reject bodies over 32 KB, more than 50 events, unknown event names, props failing a zod schema.
2. Rate limit per `sid` (60 req/min) in memory per instance; good enough at this scale.
3. Drop request IP and user agent after deriving `device`. Nothing identifying is stored.
4. Insert into the store in one batch.

## 4. Store (assumes Supabase Postgres, see HLD open question 2)

```sql
create table tv_events (
  id          bigint generated always as identity primary key,
  ts          timestamptz not null,
  sid         text not null,
  name        text not null,
  target      text,
  target_ver  text,
  shell_ver   text,
  content     text,
  device      text,
  conn        text,
  props       jsonb not null default '{}'
);
create index on tv_events (name, ts desc);
create index on tv_events (target, ts desc);

-- retention: 90 days
```

The shell talks to Postgres with a server-only key. Row Level Security on, no anon access. The key never reaches a target or the client.

## 5. Summary API

`GET /api/metrics/summary?window=24h|7d|30d`, cached `s-maxage=300, stale-while-revalidate=600`.

```ts
interface MetricsSummary {
  window: "24h" | "7d" | "30d";
  sessions: number;
  targets: Array<{
    id: string;
    loads: number;
    loadMs: { p50: number; p75: number; p95: number };
    loadBreakdownP75: { manifest: number; entry: number; mount: number; ready: number };
    errorRate: number;               // target_error / target_load
    topErrors: Array<{ code: string; count: number }>;
  }>;
  switches: Array<{ from: string; to: string; count: number; p75: number }>;
  vitals: Record<"LCP" | "INP" | "CLS", { p75: number; good: number }>; // good = share meeting CWV threshold
  series: Array<{ bucket: string; target: string; p75LoadMs: number }>; // for the time chart
}
```

Percentiles via `percentile_cont` in SQL. Buckets: hourly for 24h, daily otherwise.

`MetricsClient` (given to targets with `metrics-read`) wraps this endpoint plus a live subscription to the local ring buffer:

```ts
interface MetricsClient {
  summary(window: "24h" | "7d" | "30d", signal?: AbortSignal): Promise<MetricsSummary>;
  live(fn: (e: TelemetryEvent) => void): () => void;   // this tab's events as they happen
}
```

## 6. Metrics target

Manifest: `capabilities: ["metrics-read"]`, `a11y: "full"`, `motion: "safe"`, budget 60 KB gz (Preact or Svelte plus uPlot; avoid a heavy charting library).

Layout:

| Panel | Source | Content |
|---|---|---|
| This session | `live()` | Timeline of every event in this tab, including the load of the metrics target itself. The visitor sees their own switch from AST to here as the most recent row. |
| Target load | `summary` | p50/p75/p95 per target, stacked breakdown bar (manifest, entry, mount, ready) |
| Switch matrix | `summary.switches` | from × to grid of p75 switch time |
| Reliability | `summary.targets[].errorRate`, `topErrors` | Error rate per target with codes linked to LLD-02 §8 descriptions |
| Core Web Vitals | `summary.vitals` | p75 and pass share for LCP, INP, CLS |
| Over time | `summary.series` | p75 load per target, one line each |

Focus behavior: entities in the IR are not the subject here, so `setFocus` highlights the row for a target when the focused id equals a target id (the graph can carry a `project` entity for The Traversal itself, `thetraversal`, whose focus pins the whole dashboard). For any other id the dashboard shows a small "focused: <label>" chip linking to `/node/<id>`. This satisfies obligation 4 without forcing meaning where there is none.

Empty states: before the store has data (or with GPC), show only "This session" and say why the rest is empty.

## 7. Phasing

1. Phase 6a: client pipeline + `live()` only. Metrics target ships with the "This session" panel. No backend.
2. Phase 6b: ingest, store, summary API, remaining panels.
3. Footer line on every page: what is collected, link to `/node/thetraversal` where the telemetry design is described.
