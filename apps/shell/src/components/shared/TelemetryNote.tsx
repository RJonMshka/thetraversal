import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Telemetry disclosure (LLD-05 §7) ───────────────────────────────────
// What leaves the browser, in one line. Rendered only by builds that send
// (TV_INGEST, set when TELEMETRY_STORE names an adapter), so callers gate
// it with `TELEMETRY_ON` and the line costs nothing until then.

export const TELEMETRY_ON = process.env.TV_INGEST === "1";

export function TelemetryNote({ className }: { className?: string }) {
  return (
    <p className={cn("font-mono text-[10px] leading-relaxed text-[var(--text-faint)]", className)}>
      measured: target load and switch times, web vitals, error codes · per-tab id, no cookies, no IP ·{" "}
      <Link href="/node/thetraversal" className="text-[var(--text-mute)] hover:text-[var(--accent)]">
        how
      </Link>
      {" · "}
      <Link href="/t/metrics" className="text-[var(--text-mute)] hover:text-[var(--accent)]">
        see it
      </Link>
    </p>
  );
}
