"use client";

import { Suspense, useState } from "react";
import { useKonamiCode } from "@/hooks/useKonamiCode";
import { useIdleMessage } from "@/hooks/useIdleMessage";
import { preloadable, usePreloadWhenIdle } from "@/lib/preloadable";

// ── Easter eggs ────────────────────────────────────────────────────────
// The Konami code shows Clause syntax for 10 s; 30 s of inactivity shows
// an idle message. The triggers live here and are cheap; the animated
// overlays (and Framer Motion) load on first use.

const Konami = preloadable(() => import("@/components/chrome/EasterEggMotion").then((m) => m.KonamiOverlay));
const Idle = preloadable(() => import("@/components/chrome/EasterEggMotion").then((m) => m.IdleOverlay));

export function EasterEggOverlays() {
  const konami = useKonamiCode(10000);
  const idle = useIdleMessage(30000);
  // Once shown, an overlay stays mounted so its exit animation can run.
  const [konamiSeen, setKonamiSeen] = useState(false);
  const [idleSeen, setIdleSeen] = useState(false);
  if (konami && !konamiSeen) setKonamiSeen(true);
  if (idle && !idleSeen) setIdleSeen(true);

  usePreloadWhenIdle(Idle.preload);

  return (
    <Suspense fallback={null}>
      {konamiSeen && <Konami.Component isActive={konami} />}
      {idleSeen && <Idle.Component showMessage={idle} />}
    </Suspense>
  );
}
