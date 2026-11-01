"use client";

import { usePreloadWhenIdle } from "@/lib/preloadable";
import { startTelemetry } from "@/platform/telemetry";

/**
 * Starts the telemetry pipeline once the page is idle (LLD-05 §2). Until
 * then events are only queued, so the pipeline is not first-load JS.
 */
export function Telemetry() {
  usePreloadWhenIdle(startTelemetry);
  return null;
}
