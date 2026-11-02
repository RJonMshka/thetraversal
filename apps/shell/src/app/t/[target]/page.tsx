import { Suspense } from "react";
import { notFound } from "next/navigation";
import { OutlineGate } from "@/chrome/OutlineGate";
import { TargetView } from "@/chrome/TargetView";
import { TARGETS, isTargetId } from "@/platform/registry";

// ── /t/[target] (LLD-03 §1) ────────────────────────────────────────────
// Static per registered target; unknown ids are a real 404. The outline
// is in the prerendered HTML, so crawlers and no-JS visitors get the
// whole portfolio as text; visitors with JS see a loading line instead
// unless the target fails or stalls (OutlineGate).

export const dynamicParams = false;

export function generateStaticParams() {
  return TARGETS.map(({ id }) => ({ target: id }));
}

export default async function TargetPage({ params }: { params: Promise<{ target: string }> }) {
  const { target } = await params;
  if (!isTargetId(target)) notFound();

  return (
    <Suspense
      fallback={
        <main id="main-content" className="relative h-screen overflow-y-auto" style={{ background: "var(--ink)" }}>
          <OutlineGate targetId={target} />
        </main>
      }
    >
      <TargetView targetId={target}>
        <OutlineGate targetId={target} />
      </TargetView>
    </Suspense>
  );
}
