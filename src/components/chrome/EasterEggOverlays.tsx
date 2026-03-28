"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useKonamiCode } from "@/hooks/useKonamiCode";
import { useIdleMessage } from "@/hooks/useIdleMessage";

// ── Clause syntax overlay ──────────────────────────────────────────────
// When the Konami code is activated, overlay Clause-style syntax hints
// at the edges of the viewport for 10 seconds.

const CLAUSE_SNIPPETS = [
  "let identity = fn(name) -> { reflect(name) }",
  "match visitor { :curious -> traverse(deeper) }",
  "pipe(experience, |> compile, |> understand)",
  "type Consciousness = Observer | Observed | Both",
  "let portfolio = AST::new(rajat) |> render",
  "fn traverse(node) -> node.children |> map(visit)",
];

function KonamiOverlay() {
  const isActive = useKonamiCode(10000);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 pointer-events-none z-[90]"
          aria-hidden="true"
        >
          {/* Top-left cluster */}
          <div className="absolute top-4 left-4 space-y-2 max-w-xs">
            {CLAUSE_SNIPPETS.slice(0, 3).map((snippet, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 0.7, x: 0 }}
                transition={{ delay: i * 0.15, duration: 0.3 }}
                className="text-[11px] font-mono text-ctp-mauve/70 bg-ctp-mantle/80 px-3 py-1.5 rounded border border-ctp-surface0/50"
              >
                {snippet}
              </motion.div>
            ))}
          </div>

          {/* Bottom-right cluster */}
          <div className="absolute bottom-16 right-4 space-y-2 max-w-xs text-right">
            {CLAUSE_SNIPPETS.slice(3).map((snippet, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 0.7, x: 0 }}
                transition={{ delay: i * 0.15 + 0.3, duration: 0.3 }}
                className="text-[11px] font-mono text-ctp-teal/70 bg-ctp-mantle/80 px-3 py-1.5 rounded border border-ctp-surface0/50"
              >
                {snippet}
              </motion.div>
            ))}
          </div>

          {/* Center label */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="text-xs font-mono text-ctp-yellow/80 bg-ctp-crust/90 px-4 py-2 rounded-lg border border-ctp-yellow/20">
              // Clause mode activated for 10s
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Idle message ───────────────────────────────────────────────────────
// "The observer is still. The tree awaits." after 30s of inactivity.

function IdleOverlay() {
  const showMessage = useIdleMessage(30000);

  return (
    <AnimatePresence>
      {showMessage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] pointer-events-none"
          aria-hidden="true"
        >
          <p className="text-xs font-serif italic text-ctp-overlay2/70 tracking-wide">
            The observer is still. The tree awaits.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Combined export ────────────────────────────────────────────────────

export function EasterEggOverlays() {
  return (
    <>
      <KonamiOverlay />
      <IdleOverlay />
    </>
  );
}
