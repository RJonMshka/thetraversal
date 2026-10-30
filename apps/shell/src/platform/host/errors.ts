import { TARGET_ERRORS, TargetError, isTargetError, type TargetErrorCode } from "@tv/contract";

// ── Diagnostics (LLD-02 §8) ────────────────────────────────────────────
// Every failure surfaces as a TargetError with a code, shown to the user
// as a compiler diagnostic in the site's voice.

export function toTargetError(err: unknown, target: string, code: TargetErrorCode): TargetError {
  if (isTargetError(err)) return err;
  const detail = err instanceof Error ? err.message : undefined;
  return new TargetError(code, target, detail ?? TARGET_ERRORS[code], { cause: err });
}

export interface Diagnostic {
  code: TargetErrorCode;
  title: string;
  note: string;
}

const NOTES: Record<TargetErrorCode, string> = {
  T0001: "the target was built against a different contract version",
  T0002: "the target cannot read this version of the content IR",
  T0003: "this device lacks a capability the target needs",
  T0004: "the target could not be loaded; check your connection",
  T0005: "the target failed while starting",
  T0006: "the target did not shut down cleanly",
  T0007: "the target crashed while running",
  T0008: "the target asked for a URL parameter it does not own",
};

export function diagnose(err: TargetError): Diagnostic {
  return { code: err.code, title: err.message, note: NOTES[err.code] };
}

export function reportTargetError(err: TargetError): void {
  // Telemetry ingest arrives in Phase 6; until then the console is the log.
  console.error(err);
}
