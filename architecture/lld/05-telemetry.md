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
| `vital` | `name` (`LCP` / `INP` / `CLS` / `TTFB`), `value`, `rating`, `route` | shell, via `web-vitals` (standard build: nothing from the attribution build is sent) |
| `t.<id>.<name>` | free-form, max 8 props | target via `ctx.telemetry.event`; `ctx.telemetry.mark` emits one with `ms` since mount began |

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
  summary(window: "24h" | "7d" | "30d", signal?: AbortSignal): Promise<MetricsSummary>; // Phase 6b
  live(fn: (e: TelemetryEvent) => void): () => void;   // this tab's events: buffer replay, then as they happen
  readonly sending: TelemetrySending;                  // { on: true } | { on: false, why: "no-ingest" | "privacy" | "sampled-out" }
}
```

`sending` was added in Phase 6a so the dashboard can say why nothing leaves the tab (§6 "Empty states"). `TelemetryEvent` and `TelemetrySending` live in `@tv/contract`.

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

## 8. As built in Phase 6a

Code: `apps/shell/src/platform/telemetry/` (`index.ts`, `pipeline.ts`, `policy.ts`), `targets/metrics`. Numbers: baseline.md "Phase 6a".

- **Two halves.** `/t/ast` had 1 KB of first-load headroom, so the part that ships with every page only records `{ name, t, target, targetVersion, props }` into a 200-entry queue (`track()`), plus switch timing and the active target. `pipeline.ts` is its own chunk: it loads when the page is idle (`components/chrome/Telemetry.tsx` in the root layout) or on the first `live()` call, computes the session fields once, then takes over the queue. web-vitals is in that chunk, and reads buffered entries, so TTFB and LCP are not lost by starting late.
- **Session fields.** `sid` is SHA-256 of a random per-tab id (`tv.shell.tab`, sessionStorage) plus the UTC date, first 16 hex chars; FNV-1a stands in where SubtleCrypto is missing. `device` is `desktop` for a fine pointer, else `mobile` below a 600 px short screen side, else `tablet`. `shellVersion` and `contentHash` are build-time env (`TV_SHELL_VERSION`, `TV_CONTENT_HASH`, from `apps/shell/next.config.ts`).
- **`target_load`.** `mountTarget` reports through `onLoad` for every mount that was not aborted, success or failure; a phase not reached is 0. `cache` is `prefetched` when the module was already loaded in the page (switcher prefetch or an earlier mount), else `cold`. `warm-slot` is never sent: the warm slot (LLD-03 §6) is not built.
- **`target_switch`.** Starts at a switcher click or `ctx.nav.switchTarget`, ends when the new target is ready, so it includes the route change. Emitted just before that target's `target_load`. `vt` is always `false`: there are no view transitions yet. Back/forward between targets is not timed.
- **`target_error`.** `reportTargetError` sends `id`, `code`, `phase` (from the code) and the message; the pipeline swaps the message for an FNV-1a hash (`msgHash`) before the event is stored or delivered.
- **`ir_ready`.** The graph is inlined in the shell bundle, so `ms` is when `platform/ir.ts` evaluates on the client. `bytes` is the UTF-8 size of the serialized graph, measured when the pipeline takes the event.
- **Target events.** Names must match `t.<id>.<name>` with `[a-z0-9_.:-]{1,48}`; invalid ones are dropped. At most 8 props, strings cut to 64 chars.
- **Sending.** `INGEST_URL` is null, so nothing leaves the browser and no batcher timer runs. GPC or `doNotTrack === "1"` wins over everything; `TELEMETRY_SAMPLE` (build time, default 1) is decided once per tab (`tv.shell.sample`).
- **Live subscribers.** Each `live()` subscription is tied to the mount's `ctx.signal`. A subscriber that throws is unsubscribed and reported as `T0007`.
- **Metrics target.** Preact 10 with Vite's own JSX transform (no plugin), 37.8 KB gz of a 60 KB budget; the federation runtime is half of it. It renders a real `<table>` (newest first, up to 200 rows), filters, a manifest/entry/mount/ready bar per load, and a polite live region for loads, switches and errors. Focus: a target id seen this session highlights its rows; any other entity shows a `focused: <label>` chip that opens `/node/<id>`. `← <previous target>` and Esc switch back, keeping focus. Its header leaves the first row of `--tv-chrome-top` empty for the shell's chrome.

