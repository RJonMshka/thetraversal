"use client";

import { useRef, useState, type JSX, type KeyboardEvent } from "react";
import Link from "next/link";
import { THEMES, type ThemeName } from "@tv/tokens";
import { entitiesByDepth, ir } from "@/platform/ir";
import type { TargetId } from "@/platform/registry";
import { FLAVORS, FLAVOR_IDS } from "@/lib/prompt-commands";
import { setTheme, useTheme } from "@/lib/theme-sync";

// ── Flavors: one source, several backends ──────────────────────────────
// Each listed target gets a tab with a still preview drawn from the real
// IR. Nothing moves until the visitor points at it. Target code is not
// prefetched here: importing the loader from this page moves shared code
// into /t/ast's first load, which has no budget left. Next prefetches the
// /t/<id> route itself; the remote loads on mount.

const ROOT = ir.graph.rootId;
const SECTIONS = ir.children(ROOT);
const DEPTHS = entitiesByDepth().reduce<number[]>((acc, { depth }) => {
  acc[depth] = (acc[depth] ?? 0) + 1;
  return acc;
}, []);
const TOTAL = DEPTHS.reduce((a, b) => a + b, 0);
const MONO = "var(--mono)";

function clip(text: string, width: number, px = 4.4): string {
  const max = Math.max(3, Math.floor((width - 6) / px));
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// ── ast: the root, its sections, and the children of the one you point at ─
function AstPreview() {
  const [open, setOpen] = useState(SECTIONS[1]?.id ?? SECTIONS[0]?.id);
  const kids = ir.children(open ?? ROOT);
  const n = SECTIONS.length;
  const w1 = Math.min(54, 400 / n - 6);
  const m = Math.max(1, kids.length);
  const w2 = Math.min(76, 400 / m - 6);
  const x1 = (i: number) => (400 * (i + 0.5)) / n;
  const x2 = (i: number) => (400 * (i + 0.5)) / m;
  const xo = x1(SECTIONS.findIndex((s) => s.id === open));

  return (
    <svg viewBox="0 0 400 190" className="block h-auto w-full" role="group" aria-label="Sections of the tree">
      {SECTIONS.map((s, i) => (
        <path key={s.id} d={`M200,34 C200,56 ${x1(i)},56 ${x1(i)},72`} fill="none"
          stroke={s.id === open ? "var(--accent)" : "var(--line-2)"} strokeWidth={s.id === open ? 1.2 : 0.8} />
      ))}
      {kids.map((k, i) => (
        <path key={k.id} d={`M${xo},92 C${xo},116 ${x2(i)},116 ${x2(i)},134`} fill="none" stroke="var(--accent-dim)" />
      ))}
      <Link href={`/node/${ROOT}`}>
        <rect x="150" y="10" width="100" height="24" rx="3" fill="var(--ink)" stroke="var(--line-2)" />
        <text x="200" y="25" textAnchor="middle" fontFamily={MONO} fontSize="9" fill="var(--tv-text)">
          {ir.entity(ROOT)?.label}
        </text>
      </Link>
      {SECTIONS.map((s, i) => {
        const on = s.id === open;
        return (
          <Link key={s.id} href={`/node/${s.id}`} onPointerEnter={() => setOpen(s.id)} onFocus={() => setOpen(s.id)}>
            <title>{s.label}</title>
            <rect x={x1(i) - w1 / 2} y="72" width={w1} height="20" rx="3"
              fill={on ? "var(--accent-faint)" : "var(--ink)"} stroke={on ? "var(--accent)" : "var(--line-2)"} />
            <text x={x1(i)} y="85" textAnchor="middle" fontFamily={MONO} fontSize="7.5"
              fill={on ? "var(--accent)" : "var(--text-mute)"}>
              {clip(s.label, w1)}
            </text>
          </Link>
        );
      })}
      {kids.map((k, i) => (
        <Link key={k.id} href={`/node/${k.id}`}>
          <title>{k.label}</title>
          <rect x={x2(i) - w2 / 2} y="134" width={w2} height="18" rx="2" fill="var(--accent-faint)" stroke="var(--accent-dim)" />
          <text x={x2(i)} y="146" textAnchor="middle" fontFamily={MONO} fontSize="7" fill="var(--accent)">
            {clip(k.label, w2, 4.2)}
          </text>
        </Link>
      ))}
      <text x="200" y="178" textAnchor="middle" fontFamily={MONO} fontSize="7.5" fill="var(--text-faint)">
        point at a section · click any node to open it
      </text>
    </svg>
  );
}

// ── three: one plane per depth, a dot per entity ───────────────────────
function ThreePreview() {
  const D = DEPTHS.length;
  const gap = 150 / Math.max(1, D - 1);
  const [x0, x1, skew, h] = [78, 322, 46, 24];
  return (
    <svg viewBox="0 0 400 190" className="block h-auto w-full" aria-hidden="true">
      <line x1={x0 + 10 + skew / 2} y1="20" x2={x0 + 10 + skew / 2} y2={20 + gap * (D - 1)}
        stroke="var(--accent-dim)" strokeDasharray="2 3" />
      {DEPTHS.map((count, d) => {
        const y = 20 + d * gap;
        return (
          <g key={d}>
            <polygon fill="var(--accent-faint)" stroke="var(--line-2)"
              points={`${x0 + skew},${y - h / 2} ${x1 + skew},${y - h / 2} ${x1},${y + h / 2} ${x0},${y + h / 2}`} />
            {Array.from({ length: count }, (_, i) => {
              const u = (i + 0.5) / count;
              const v = count > 1 ? (i % 2 ? 0.7 : 0.3) : 0.5;
              return (
                <circle key={i} r={d === 0 ? 3 : 1.8} fill="var(--accent)"
                  cx={x0 + u * (x1 - x0) + v * skew} cy={y + h / 2 - v * h} />
              );
            })}
            <text x={x0 - 8} y={y + 3} textAnchor="end" fontFamily={MONO} fontSize="8" fill="var(--text-mute)">d{d}</text>
            <text x={x1 + skew + 8} y={y + 3} fontFamily={MONO} fontSize="8" fill="var(--text-faint)">{count}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── build: the page under a devtools overlay ───────────────────────────
function BuildPreview() {
  const n = SECTIONS.length;
  const cw = 320 / n;
  return (
    <svg viewBox="0 0 400 190" className="block h-auto w-full" aria-hidden="true">
      <rect x="6" y="6" width="388" height="178" fill="var(--syntax-ident)" fillOpacity="0.1" />
      <rect x="18" y="18" width="364" height="154" fill="var(--syntax-string)" fillOpacity="0.1" stroke="var(--line-2)" />
      <rect x="30" y="30" width="340" height="130" fill="var(--syntax-type)" fillOpacity="0.07" />
      <text x="10" y="15" fontFamily={MONO} fontSize="6.5" fill="var(--syntax-ident)">margin</text>
      <text x="22" y="27" fontFamily={MONO} fontSize="6.5" fill="var(--syntax-string)">padding</text>
      <text x="366" y="27" textAnchor="end" fontFamily={MONO} fontSize="6.5" fill="var(--text-faint)">340 × 130</text>
      <text x="38" y="46" fontFamily={MONO} fontSize="8" fill="var(--syntax-keyword)">{"<body>"}</text>
      <text x="80" y="47" fontFamily="var(--serif)" fontSize="12" fill="var(--tv-text)">{ir.entity(ROOT)?.label}</text>
      <text x="362" y="66" textAnchor="end" fontFamily={MONO} fontSize="6.5" fill="var(--syntax-keyword)">display: flex</text>
      {SECTIONS.map((s, i) => (
        <g key={s.id}>
          <rect x={40 + i * cw} y="70" width={cw - 4} height="22" rx="2" fill="var(--ink)" stroke="var(--accent-dim)" />
          <text x={40 + i * cw + (cw - 4) / 2} y="84" textAnchor="middle" fontFamily={MONO} fontSize="6.5" fill="var(--text-mute)">
            {clip(s.label, cw - 4, 4)}
          </text>
        </g>
      ))}
      <text x="362" y="104" textAnchor="end" fontFamily={MONO} fontSize="6.5" fill="var(--syntax-keyword)">display: grid</text>
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={40 + (i % 4) * 81} y={108 + Math.floor(i / 4) * 24} width="77" height="20" rx="2"
          fill="var(--accent-faint)" stroke="var(--syntax-keyword)" strokeOpacity="0.45" strokeDasharray="3 2" />
      ))}
    </svg>
  );
}

const PREVIEW: Partial<Record<TargetId, () => JSX.Element>> = {
  ast: AstPreview,
  three: ThreePreview,
  build: BuildPreview,
};

function Skins() {
  const { theme } = useTheme();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--line)] pt-3">
      <span className="mr-1 text-[10px] text-ctp-overlay0">skin</span>
      {(Object.keys(THEMES) as ThemeName[]).map((name) => {
        const t = THEMES[name];
        const on = name === theme;
        return (
          <button
            key={name}
            type="button"
            aria-label={`theme ${name}`}
            aria-pressed={on}
            title={t.label}
            onClick={() => setTheme({ theme: name })}
            className={`grid h-5 w-5 place-items-center rounded-[3px] border ${on ? "border-ctp-green" : "border-ctp-surface2"}`}
            // Each swatch previews its own theme's colors.
            style={{ background: t.bg }}
          >
            <span className="block h-2 w-2 rounded-full" style={{ background: t.accent }} />
          </button>
        );
      })}
    </div>
  );
}

export function FlavorPicker() {
  const [sel, setSel] = useState<TargetId>(FLAVOR_IDS[0]);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const Preview = PREVIEW[sel];
  const copy = FLAVORS[sel];

  const pick = setSel;

  // Tabs pattern: arrows, Home and End move between flavors.
  const onKey = (e: KeyboardEvent) => {
    const i = FLAVOR_IDS.indexOf(sel);
    const last = FLAVOR_IDS.length - 1;
    const next =
      e.key === "ArrowRight" ? (i + 1) % FLAVOR_IDS.length
      : e.key === "ArrowLeft" ? (i - 1 + FLAVOR_IDS.length) % FLAVOR_IDS.length
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : -1;
    if (next < 0) return;
    e.preventDefault();
    pick(FLAVOR_IDS[next]);
    tabs.current[next]?.focus();
  };

  return (
    <section className="tv-card p-[18px]" aria-labelledby="flavors-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="flavors-title" className="tv-tag">{`// one source · ${FLAVOR_IDS.length} backends`}</h2>
        <span className="text-[10px] text-ctp-overlay0">
          <span className="text-ctp-green">{TOTAL} nodes</span> · depth {DEPTHS.length - 1}
        </span>
      </div>

      <div role="tablist" aria-label="Ways to traverse" className="flex flex-wrap gap-1.5" onKeyDown={onKey}>
        {FLAVOR_IDS.map((id, i) => (
          <button
            key={id}
            ref={(el) => { tabs.current[i] = el; }}
            type="button"
            role="tab"
            id={`flavor-tab-${id}`}
            aria-selected={id === sel}
            aria-controls="flavor-panel"
            tabIndex={id === sel ? 0 : -1}
            className="tv-chip"
            data-on={id === sel ? "true" : undefined}
            onClick={() => pick(id)}
            onPointerEnter={() => pick(id)}
          >
            --target={id}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="flavor-panel" aria-labelledby={`flavor-tab-${sel}`} className="mt-3">
        <div className="rounded border border-[var(--line)] bg-ctp-base p-2">{Preview && <Preview />}</div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <p className="max-w-[34ch] text-[11px] leading-relaxed text-ctp-subtext0">
            <span className="text-ctp-text">{copy?.title}.</span> {copy?.line}
          </p>
          <Link
            href={`/t/${sel}`}
            className="whitespace-nowrap text-[11px] text-ctp-green underline underline-offset-4"
          >
            traverse as {sel} →
          </Link>
        </div>
      </div>

      <Skins />
    </section>
  );
}
