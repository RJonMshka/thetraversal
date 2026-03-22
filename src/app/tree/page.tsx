import Link from "next/link";

export default function TreePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen font-mono">
      <div className="text-ctp-overlay1 text-sm mb-4">
        {"// Phase 2: AST Visualizer"}
      </div>
      <h1 className="text-2xl text-ctp-text mb-2">The Tree</h1>
      <p className="text-ctp-subtext0 text-sm mb-8">
        The AST visualizer will be built in Phase 3.
      </p>
      <Link
        href="/"
        className="text-ctp-green hover:text-ctp-green/80 text-sm transition-colors"
      >
        {"<-"} Back to root
      </Link>
    </main>
  );
}
