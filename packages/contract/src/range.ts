// ── Semver range check (LLD-03 §4) ─────────────────────────────────────
// Enough of semver for manifest `ir` ranges: space-separated comparators
// (">=1.0.0 <2.0.0", "=1.2.3", "1.2.3"), caret ("^1.2.0"), tilde
// ("~1.2.0"), and "*". Prerelease tags are not supported.

type Version = [number, number, number];

function parse(v: string): Version | null {
  const m = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(v.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)];
}

function compare(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

function test(version: Version, comparator: string): boolean {
  if (comparator === "*" || comparator === "") return true;
  if (comparator.startsWith("^") || comparator.startsWith("~")) {
    const base = parse(comparator.slice(1));
    if (!base) return false;
    const upper: Version =
      comparator[0] === "~"
        ? [base[0], base[1] + 1, 0]
        : base[0] > 0
          ? [base[0] + 1, 0, 0]
          : base[1] > 0
            ? [0, base[1] + 1, 0]
            : [0, 0, base[2] + 1];
    return compare(version, base) >= 0 && compare(version, upper) < 0;
  }
  const m = /^(>=|<=|>|<|=)?(.*)$/.exec(comparator);
  const target = m ? parse(m[2]) : null;
  if (!m || !target) return false;
  const c = compare(version, target);
  switch (m[1]) {
    case ">=":
      return c >= 0;
    case "<=":
      return c <= 0;
    case ">":
      return c > 0;
    case "<":
      return c < 0;
    default:
      return c === 0;
  }
}

/** True when `version` satisfies every comparator in `range`. Invalid input is false. */
export function satisfiesRange(version: string, range: string): boolean {
  const v = parse(version);
  if (!v) return false;
  return range
    .trim()
    .split(/\s+/)
    .every((comparator) => test(v, comparator));
}
