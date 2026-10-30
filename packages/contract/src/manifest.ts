import type { Capability, TargetManifest } from "./types";

// ── Manifest validation (LLD-02 §2, LLD-03 §4) ─────────────────────────
// The shell reads manifest.json over the network before loading any code,
// so its shape is checked at runtime. Hand-written rather than zod: this
// runs in the shell's client bundle, and the shape is small and stable.

const CAPABILITIES: readonly Capability[] = ["webgl", "webgl2", "offscreen-canvas", "audio", "llm", "metrics-read"];
const ENTRY_KINDS = ["mf", "esm", "local"] as const;
const A11Y = ["full", "partial", "decorative"] as const;
const MOTION = ["safe", "reduced-variant", "static-fallback"] as const;

export class ManifestError extends Error {
  constructor(path: string, problem: string) {
    super(`manifest.${path}: ${problem}`);
    this.name = "ManifestError";
  }
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(obj: Json, key: string, path = key): string {
  const value = obj[key];
  if (typeof value !== "string" || value.length === 0) throw new ManifestError(path, "expected a non-empty string");
  return value;
}

function oneOf<T extends string>(obj: Json, key: string, allowed: readonly T[], path = key): T {
  const value = obj[key];
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ManifestError(path, `expected one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function strings(obj: Json, key: string): string[] {
  const value = obj[key];
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
    throw new ManifestError(key, "expected an array of strings");
  }
  return [...value];
}

/**
 * Validates untrusted JSON as a TargetManifest. The contract version is
 * checked as a number here and compared with CONTRACT_VERSION by the
 * shell, so a mismatch surfaces as T0001 rather than a parse failure.
 */
export function parseManifest(input: unknown): TargetManifest {
  if (!isObject(input)) throw new ManifestError("", "expected an object");
  const entry = input.entry;
  if (!isObject(entry)) throw new ManifestError("entry", "expected an object");
  const budget = input.budget;
  if (!isObject(budget) || typeof budget.jsKbGz !== "number" || !(budget.jsKbGz > 0)) {
    throw new ManifestError("budget.jsKbGz", "expected a positive number");
  }
  if (typeof input.contract !== "number" || !Number.isInteger(input.contract)) {
    throw new ManifestError("contract", "expected an integer");
  }
  const capabilities = strings(input, "capabilities");
  for (const cap of capabilities) {
    if (!CAPABILITIES.includes(cap as Capability)) throw new ManifestError("capabilities", `unknown capability '${cap}'`);
  }
  if (input.isolation !== "shadow") throw new ManifestError("isolation", "expected 'shadow'");

  return {
    id: str(input, "id"),
    label: str(input, "label"),
    flag: str(input, "flag"),
    description: str(input, "description"),
    version: str(input, "version"),
    // A different version still parses; the shell reports it as T0001.
    contract: input.contract as TargetManifest["contract"],
    ir: str(input, "ir"),
    entry: {
      kind: oneOf(entry, "kind", ENTRY_KINDS, "entry.kind"),
      remote: str(entry, "remote", "entry.remote"),
      expose: str(entry, "expose", "entry.expose"),
      url: str(entry, "url", "entry.url"),
    },
    capabilities: capabilities as Capability[],
    budget: { jsKbGz: budget.jsKbGz },
    urlParams: strings(input, "urlParams"),
    a11y: oneOf(input, "a11y", A11Y),
    motion: oneOf(input, "motion", MOTION),
    isolation: "shadow",
  };
}
