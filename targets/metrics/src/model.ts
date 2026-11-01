import type { TelemetryEvent, TelemetrySending } from "@tv/contract";

// ── Session model (LLD-05 §6, "This session") ──────────────────────────
// Pure functions over this tab's events: how a row reads, which filter it
// belongs to, and where "back" goes. No DOM, so it is unit tested.

export const FILTERS = ["all", "loads", "switches", "errors", "vitals", "targets"] as const;
export type Filter = (typeof FILTERS)[number];

/** Rows kept on screen; the shell replays at most its 200-event buffer. */
export const MAX_ROWS = 200;

export function matches(e: TelemetryEvent, filter: Filter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "loads":
      return e.name === "target_load" || e.name === "ir_ready";
    case "switches":
      return e.name === "target_switch";
    case "errors":
      return e.name === "target_error" || (e.name === "target_load" && e.props.outcome !== "ok");
    case "vitals":
      return e.name === "vital";
    case "targets":
      return e.name.startsWith("t.");
  }
}

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown): string => (v === undefined ? "" : String(v));

export interface LoadPhases {
  manifest: number;
  entry: number;
  mount: number;
  ready: number;
}

export interface Row {
  /** Plain-text description, also what a screen reader hears. */
  text: string;
  /** Load breakdown for the stacked bar (target_load only). */
  phases?: LoadPhases;
  failed?: boolean;
}

function propsText(props: TelemetryEvent["props"]): string {
  const parts = Object.entries(props).map(([k, v]) => `${k}=${v}`);
  return parts.length > 0 ? parts.join(" ") : "(no props)";
}

export function describe(e: TelemetryEvent): Row {
  const p = e.props;
  switch (e.name) {
    case "target_load": {
      const phases = { manifest: num(p.manifestMs), entry: num(p.entryMs), mount: num(p.mountMs), ready: num(p.readyMs) };
      if (p.outcome !== "ok") {
        return { text: `${str(p.id)} error[${str(p.outcome)}] after ${num(p.totalMs)} ms`, phases, failed: true };
      }
      return { text: `${str(p.id)} ready in ${num(p.totalMs)} ms · ${str(p.cache)}`, phases };
    }
    case "target_switch":
      return { text: `${str(p.from)} → ${str(p.to)} in ${num(p.ms)} ms` };
    case "target_error":
      return { text: `${str(p.id)} error[${str(p.code)}] while ${str(p.phase)} · #${str(p.msgHash)}`, failed: true };
    case "vital": {
      const value = p.name === "CLS" ? num(p.value).toFixed(3) : `${num(p.value)} ms`;
      return { text: `${str(p.name)} ${value} · ${str(p.rating)} · ${str(p.route)}` };
    }
    case "ir_ready":
      return { text: `${Math.round(num(p.bytes) / 1024)} KB graph, ready ${num(p.ms)} ms after navigation` };
    default:
      return { text: propsText(p) };
  }
}

/** "+1.23 s" after navigation start. */
export function clock(e: TelemetryEvent, timeOrigin: number): string {
  return `+${(Math.max(0, e.ts - timeOrigin) / 1000).toFixed(2)} s`;
}

/** Whether an event is about a target id (row highlight when focus is a target id). */
export function mentions(e: TelemetryEvent, id: string): boolean {
  return e.target === id || e.props.id === id || e.props.from === id || e.props.to === id;
}

/** Every target id seen this session. */
export function targetIds(events: readonly TelemetryEvent[]): Set<string> {
  const ids = new Set<string>();
  for (const e of events) {
    if (e.target) ids.add(e.target);
    if (e.name === "target_load" || e.name === "target_switch") {
      for (const key of ["id", "from", "to"]) if (typeof e.props[key] === "string") ids.add(e.props[key]);
    }
  }
  return ids;
}

/** The target the visitor came from: where "back" goes. Null when this was the first. */
export function previousTarget(events: readonly TelemetryEvent[], self: string): string | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]!;
    if (e.name === "target_switch" && e.props.to === self && typeof e.props.from === "string") return e.props.from;
    if (e.name === "target_load" && e.props.outcome === "ok" && typeof e.props.id === "string" && e.props.id !== self) {
      return e.props.id;
    }
  }
  return null;
}

export interface Tally {
  events: number;
  loads: number;
  switches: number;
  errors: number;
}

export function tally(events: readonly TelemetryEvent[]): Tally {
  const t: Tally = { events: events.length, loads: 0, switches: 0, errors: 0 };
  for (const e of events) {
    if (e.name === "target_load") t.loads++;
    if (e.name === "target_switch") t.switches++;
    if (matches(e, "errors")) t.errors++;
  }
  return t;
}

/** Why nothing leaves the tab, in the site's voice. */
export function sendingNote(s: TelemetrySending): string {
  if (s.on) return "sent in batches to the event store";
  switch (s.why) {
    case "privacy":
      return "kept in this tab: your browser asks not to be tracked (GPC / DNT)";
    case "sampled-out":
      return "kept in this tab: this session is outside the sample";
    case "no-ingest":
      return "kept in this tab: the event store is not connected yet";
  }
}

/** Live-region text for the events worth announcing. */
export function announcement(e: TelemetryEvent): string | null {
  if (e.name === "target_load" || e.name === "target_switch" || e.name === "target_error") {
    return `${e.name.replace("_", " ")}: ${describe(e).text}`;
  }
  return null;
}
