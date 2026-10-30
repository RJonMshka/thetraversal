// ── Error codes (LLD-02 §8) ────────────────────────────────────────────

export const TARGET_ERRORS = {
  T0001: "contract version mismatch",
  T0002: "IR schema outside declared range",
  T0003: "missing hardware capability",
  T0004: "remote failed to load or timed out",
  T0005: "mount threw or timed out",
  T0006: "unmount threw or timed out",
  T0007: "runtime error attributed to target",
  T0008: "disallowed setParam key",
} as const;

export type TargetErrorCode = keyof typeof TARGET_ERRORS;

export class TargetError extends Error {
  readonly code: TargetErrorCode;
  readonly target: string;

  constructor(code: TargetErrorCode, target: string, detail?: string, options?: { cause?: unknown }) {
    super(`error[${code}]: target '${target}': ${detail ?? TARGET_ERRORS[code]}`, options);
    this.name = "TargetError";
    this.code = code;
    this.target = target;
  }
}

export function isTargetError(err: unknown): err is TargetError {
  return err instanceof TargetError;
}
