import { createBus } from "@tv/contract";

// ── Shell bus (LLD-02 §5) ──────────────────────────────────────────────
// One bus per page. Each mounted target gets `shellBus.scope()`, whose
// subscriptions are force-cleared on unmount.

export const shellBus = createBus();
