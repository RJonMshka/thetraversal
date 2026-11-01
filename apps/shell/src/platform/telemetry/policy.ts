import type { TelemetrySending } from "@tv/contract";

// ── Whether events leave the browser (LLD-05 §2) ───────────────────────
// Events are always kept in memory, so the metrics target can show the
// visitor their own session. Sending needs an ingest endpoint (Phase 6b
// adds /api/t), no Global Privacy Control or Do Not Track, and a tab
// inside the TELEMETRY_SAMPLE share.

/** Phase 6b sets this to "/api/t". */
export const INGEST_URL: string | null = null;

const SAMPLE = Number(process.env.TELEMETRY_SAMPLE ?? "1");

type PrivacyNavigator = Navigator & { globalPrivacyControl?: boolean };

export function privacyOptOut(nav: PrivacyNavigator = navigator): boolean {
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1";
}

/** Decided once per tab, so a session is sent whole or not at all. */
function sampledIn(): boolean {
  if (!(SAMPLE < 1)) return true;
  try {
    let v = sessionStorage.getItem("tv.shell.sample");
    if (v === null) sessionStorage.setItem("tv.shell.sample", (v = Math.random() < SAMPLE ? "1" : "0"));
    return v === "1";
  } catch {
    return false;
  }
}

let decided: TelemetrySending | null = null;

export function sending(): TelemetrySending {
  decided ??= privacyOptOut()
    ? { on: false, why: "privacy" }
    : !INGEST_URL
      ? { on: false, why: "no-ingest" }
      : sampledIn()
        ? { on: true }
        : { on: false, why: "sampled-out" };
  return decided;
}
