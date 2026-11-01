import { useState } from "preact/hooks";
import type { TelemetryEvent, TelemetrySending } from "@tv/contract";
import {
  FILTERS,
  clock,
  describe,
  matches,
  mentions,
  previousTarget,
  sendingNote,
  tally,
  targetIds,
  type Filter,
  type LoadPhases,
} from "@/model";

// ── Metrics target view (LLD-05 §6) ────────────────────────────────────
// Phase 6a: the "This session" panel only. Every telemetry event in this
// tab, newest first, including the load of this dashboard.

export interface AppProps {
  self: string;
  events: readonly TelemetryEvent[];
  focus: { id: string; label: string } | null;
  sending: TelemetrySending;
  timeOrigin: number;
  announce: string;
  /** Stable per event, for row keys. */
  keyOf(e: TelemetryEvent): number;
  onBack(to: string): void;
  onOpen(id: string): void;
}

const BAR_W = 96;
const PHASES: (keyof LoadPhases)[] = ["manifest", "entry", "mount", "ready"];

function LoadBar({ phases }: { phases: LoadPhases }) {
  const total = PHASES.reduce((sum, k) => sum + phases[k], 0);
  if (total <= 0) return null;
  let x = 0;
  return (
    <svg class="bar" width={BAR_W} height="6" viewBox={`0 0 ${BAR_W} 6`} aria-hidden="true">
      {PHASES.map((k) => {
        const w = (phases[k] / total) * BAR_W;
        const rect = <rect key={k} class={`seg-${k}`} x={x} y="0" width={w} height="6" />;
        x += w;
        return rect;
      })}
    </svg>
  );
}

export function App({ self, events, focus, sending, timeOrigin, announce, keyOf, onBack, onOpen }: AppProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const back = previousTarget(events, self);
  const t = tally(events);
  // A focused target id highlights its rows; any other entity gets a chip.
  const focusTarget = focus && targetIds(events).has(focus.id) ? focus.id : null;
  const latest = events.at(-1);
  const rows = events.filter((e) => matches(e, filter)).reverse();

  return (
    <div class="app">
      <header class="head">
        <div class="chrome" aria-hidden="true" />
        <div class="band">
          <span class="acc">›</span> the platform measuring itself<span class="more"> · this tab&apos;s events, live</span>
        </div>
      </header>

      <div class="body">
        <section aria-labelledby="session-h">
          <div class="title">
            <h1 id="session-h">
              <span class="kw">this</span> session
            </h1>
            {back && (
              <button type="button" class="back" onClick={() => onBack(back)}>
                ← {back} <kbd>esc</kbd>
              </button>
            )}
          </div>

          <dl class="stats">
            <div>
              <dt>sid</dt>
              <dd>{latest?.sid ?? "…"}</dd>
            </div>
            <div>
              <dt>events</dt>
              <dd>{t.events}</dd>
            </div>
            <div>
              <dt>loads</dt>
              <dd>{t.loads}</dd>
            </div>
            <div>
              <dt>switches</dt>
              <dd>{t.switches}</dd>
            </div>
            <div>
              <dt>errors</dt>
              <dd class={t.errors > 0 ? "bad" : undefined}>{t.errors}</dd>
            </div>
          </dl>
          <p class="note">
            <span class="kw">sending</span> {sendingNote(sending)}
          </p>

          <div class="tools">
            <div role="group" aria-label="Filter events" class="filters">
              {FILTERS.map((f) => (
                <button key={f} type="button" class="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                  {f}
                </button>
              ))}
            </div>
            {focus && !focusTarget && (
              <button type="button" class="chip focus" onClick={() => onOpen(focus.id)}>
                focused: {focus.label} <span aria-hidden="true">↗</span>
              </button>
            )}
          </div>

          <div class="scroll" tabIndex={0} aria-labelledby="session-cap">
            <table>
              <caption id="session-cap">
                Telemetry events in this tab, newest first
                {filter !== "all" && ` (${filter})`}. Load bars split manifest, entry, mount and ready.
              </caption>
              <thead>
                <tr>
                  <th scope="col">t</th>
                  <th scope="col">event</th>
                  <th scope="col" class="c-target">
                    target
                  </th>
                  <th scope="col">detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const row = describe(e);
                  const cls = [
                    e === latest && "latest",
                    focusTarget && mentions(e, focusTarget) && "hl",
                    row.failed && "failed",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <tr key={keyOf(e)} class={cls || undefined}>
                      <td class="c-t">{clock(e, timeOrigin)}</td>
                      <td class="c-name">
                        {e.name}
                        {e === latest && <span class="now"> latest</span>}
                      </td>
                      <td class="c-target">{e.target ?? "—"}</td>
                      <td class="c-detail">
                        {row.phases && <LoadBar phases={row.phases} />}
                        <span>{row.text}</span>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} class="empty">
                      no {filter} events in this tab yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p class="legend" aria-hidden="true">
            <span class="sw seg-manifest" /> manifest <span class="sw seg-entry" /> entry <span class="sw seg-mount" /> mount{" "}
            <span class="sw seg-ready" /> ready
          </p>
        </section>

        <section aria-labelledby="later-h" class="later">
          <h2 id="later-h">across visitors</h2>
          <p>
            Load percentiles per target, the switch matrix, reliability, Core Web Vitals and trends need the event store.
            It is not connected yet, so this dashboard shows only your own session, and nothing leaves this tab.
          </p>
        </section>
      </div>

      <p class="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
