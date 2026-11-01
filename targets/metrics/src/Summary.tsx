import type { MetricsSummary, MetricsWindow } from "@tv/contract";
import { LoadBar } from "@/LoadBar";
import {
  WINDOWS,
  bucketLabel,
  chart,
  emptyNote,
  errorText,
  ms,
  pct,
  switchMatrix,
  vitalPasses,
  vitalValue,
  type SummaryState,
} from "@/aggregate";

// ── Across-visitors panels (LLD-05 §6) ─────────────────────────────────
// Target load, switch matrix, reliability, Core Web Vitals, over time.
// Every chart has a table a screen reader can read.

export interface SummaryProps {
  state: SummaryState;
  window: MetricsWindow;
  /** Target id the shell's focus points at, if any: its rows are highlighted. */
  focusTarget: string | null;
  onWindow(w: MetricsWindow): void;
}

const LINES = 5;
const CHART_W = 640;
const CHART_H = 160;

function TargetLoad({ s, focusTarget }: { s: MetricsSummary; focusTarget: string | null }) {
  return (
    <div class="panel">
      <h3 id="load-h">target load</h3>
      <div class="scroll" tabIndex={0} aria-labelledby="load-h">
        <table>
          <caption class="sr-only">Load time per target, in milliseconds, with the p75 split by phase</caption>
          <thead>
            <tr>
              <th scope="col">target</th>
              <th scope="col" class="n">loads</th>
              <th scope="col" class="n">p50</th>
              <th scope="col" class="n">p75</th>
              <th scope="col" class="n">p95</th>
              <th scope="col" class="c-split">p75 split</th>
            </tr>
          </thead>
          <tbody>
            {s.targets.map((t) => (
              <tr key={t.id} class={t.id === focusTarget ? "hl" : undefined}>
                <th scope="row" class="c-name">
                  {t.id}
                </th>
                <td class="n">{t.loads}</td>
                <td class="n">{ms(t.loadMs.p50)}</td>
                <td class="n">{ms(t.loadMs.p75)}</td>
                <td class="n">{ms(t.loadMs.p95)}</td>
                <td class="c-split">
                  <LoadBar phases={t.loadBreakdownP75} width={120} />
                  <span class="sr-only">
                    manifest {t.loadBreakdownP75.manifest}, entry {t.loadBreakdownP75.entry}, mount {t.loadBreakdownP75.mount}, ready{" "}
                    {t.loadBreakdownP75.ready} ms
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Switches({ s }: { s: MetricsSummary }) {
  const m = switchMatrix(s);
  if (m.ids.length === 0) return null;
  return (
    <div class="panel">
      <h3 id="switch-h">switch matrix</h3>
      <div class="scroll" tabIndex={0} aria-labelledby="switch-h">
        <table class="matrix">
          <caption class="sr-only">p75 switch time from the row target to the column target, with the number of switches</caption>
          <thead>
            <tr>
              <td>
                <span class="mute">from ↓ to →</span>
              </td>
              {m.ids.map((to) => (
                <th key={to} scope="col">
                  {to}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.ids.map((from) => (
              <tr key={from}>
                <th scope="row" class="c-name">
                  {from}
                </th>
                {m.ids.map((to) => {
                  const c = m.cell(from, to);
                  return (
                    <td key={to} class="n">
                      {c ? (
                        <>
                          {ms(c.p75)} <span class="mute">×{c.count}</span>
                        </>
                      ) : (
                        <span class="mute">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Reliability({ s, focusTarget }: { s: MetricsSummary; focusTarget: string | null }) {
  return (
    <div class="panel">
      <h3 id="rel-h">reliability</h3>
      <div class="scroll" tabIndex={0} aria-labelledby="rel-h">
        <table>
          <caption class="sr-only">Errors per load and the most frequent error codes per target</caption>
          <thead>
            <tr>
              <th scope="col">target</th>
              <th scope="col" class="n">error rate</th>
              <th scope="col">top errors</th>
            </tr>
          </thead>
          <tbody>
            {s.targets.map((t) => (
              <tr key={t.id} class={[t.id === focusTarget && "hl", t.errorRate > 0 && "failed"].filter(Boolean).join(" ") || undefined}>
                <th scope="row" class="c-name">
                  {t.id}
                </th>
                <td class="n">{pct(t.errorRate)}</td>
                <td class="c-detail">
                  {t.topErrors.length === 0
                    ? "none"
                    : t.topErrors.map((e) => `${errorText(e.code)} ×${e.count}`).join(" · ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Vitals({ s }: { s: MetricsSummary }) {
  const names = ["LCP", "INP", "CLS"] as const;
  return (
    <div class="panel">
      <h3 id="cwv-h">core web vitals</h3>
      <dl class="vitals" aria-labelledby="cwv-h">
        {names.map((name) => {
          const v = s.vitals[name];
          const pass = vitalPasses(name, v.p75);
          return (
            <div key={name} class={pass === false ? "bad" : undefined}>
              <dt>{name} p75</dt>
              <dd>
                <span class="big">{vitalValue(name, v.p75)}</span>
                <span class="mute">
                  {v.samples > 0 ? ` ${pct(v.good)} good · ${v.samples} samples` : " no samples"}
                  {pass !== null && (pass ? " · passes" : " · fails")}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function OverTime({ s }: { s: MetricsSummary }) {
  const c = chart(s, CHART_W, CHART_H);
  if (c.buckets.length === 0) return null;
  const first = c.buckets[0]!;
  const last = c.buckets.at(-1)!;
  return (
    <div class="panel wide">
      <h3 id="time-h">p75 load over time</h3>
      <figure class="chart">
        <svg viewBox={`0 0 ${c.width} ${c.height}`} preserveAspectRatio="none" aria-hidden="true">
          <line class="axis" x1="0" y1={c.height - 0.5} x2={c.width} y2={c.height - 0.5} />
          <line class="grid" x1="0" y1={c.height / 2} x2={c.width} y2={c.height / 2} />
          {c.lines.map((l, i) =>
            l.points.length === 1 ? (
              <circle key={l.target} class={`line-${i % LINES}`} cx={l.points[0]!.x} cy={l.points[0]!.y} r="3" />
            ) : (
              <polyline
                key={l.target}
                class={`line-${i % LINES}`}
                points={l.points.map((p) => `${p.x},${p.y}`).join(" ")}
                vector-effect="non-scaling-stroke"
              />
            )
          )}
        </svg>
        <figcaption class="axes" aria-hidden="true">
          <span>{bucketLabel(first, s.window)}</span>
          <span>max {ms(c.yMax)}</span>
          <span>{bucketLabel(last, s.window)}</span>
        </figcaption>
      </figure>
      <p class="legend" aria-hidden="true">
        {c.lines.map((l, i) => (
          <span key={l.target}>
            <span class={`sw sw-line line-${i % LINES}`} /> {l.target}{" "}
          </span>
        ))}
      </p>
      <table class="sr-only">
        <caption>p75 load per target per {s.window === "24h" ? "hour" : "day"}, UTC</caption>
        <thead>
          <tr>
            <th scope="col">{s.window === "24h" ? "hour" : "day"}</th>
            <th scope="col">target</th>
            <th scope="col">p75</th>
          </tr>
        </thead>
        <tbody>
          {s.series.map((p) => (
            <tr key={`${p.bucket} ${p.target}`}>
              <td>{bucketLabel(p.bucket, s.window)}</td>
              <td>{p.target}</td>
              <td>{ms(p.p75LoadMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Summary({ state, window, focusTarget, onWindow }: SummaryProps) {
  const note = emptyNote(state);
  const s = state.kind === "ready" && state.summary.sessions > 0 ? state.summary : null;
  const live = state.kind !== "off";
  return (
    <section aria-labelledby="across-h" class="across" aria-busy={state.kind === "loading"}>
      <div class="title">
        <h2 id="across-h">
          <span class="kw">across</span> visitors
        </h2>
        {live && (
          <div role="group" aria-label="Time window" class="filters">
            {WINDOWS.map((w) => (
              <button key={w} type="button" class="chip" aria-pressed={window === w} onClick={() => onWindow(w)}>
                {w}
              </button>
            ))}
          </div>
        )}
      </div>
      {s && (
        <p class="note">
          {s.sessions} {s.sessions === 1 ? "session" : "sessions"} in the last {window}
        </p>
      )}
      {note && <p class="note empty-note">{note}</p>}
      {s && (
        <div class="panels">
          <TargetLoad s={s} focusTarget={focusTarget} />
          <Vitals s={s} />
          <Switches s={s} />
          <Reliability s={s} focusTarget={focusTarget} />
          <OverTime s={s} />
        </div>
      )}
    </section>
  );
}
