import type { LoadPhases } from "@/model";

const PHASES: (keyof LoadPhases)[] = ["manifest", "entry", "mount", "ready"];

/** Stacked manifest / entry / mount / ready bar, proportional to the total. */
export function LoadBar({ phases, width = 96 }: { phases: LoadPhases; width?: number }) {
  const total = PHASES.reduce((sum, k) => sum + phases[k], 0);
  if (total <= 0) return null;
  let x = 0;
  return (
    <svg class="bar" width={width} height="6" viewBox={`0 0 ${width} 6`} aria-hidden="true">
      {PHASES.map((k) => {
        const w = (phases[k] / total) * width;
        const rect = <rect key={k} class={`seg-${k}`} x={x} y="0" width={w} height="6" />;
        x += w;
        return rect;
      })}
    </svg>
  );
}
