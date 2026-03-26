import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-ctp-base text-ctp-text font-mono px-4">
      <div className="text-center max-w-md">
        <p className="text-ctp-overlay2 text-xs tracking-wider uppercase mb-4">
          // ReferenceError
        </p>
        <h1 className="text-2xl font-semibold text-ctp-red mb-2">
          Node Not Found
        </h1>
        <p className="text-ctp-subtext0 text-sm mb-8">
          The requested node does not exist in this AST.
          <br />
          It may have been pruned, or the path is invalid.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/tree"
            className="inline-flex items-center gap-2 px-4 py-2 border border-ctp-surface1 rounded text-ctp-green hover:border-ctp-green transition-colors text-sm"
          >
            <span className="text-ctp-overlay0">$</span>
            traverse(root)
          </Link>
          <Link
            href="/"
            className="text-ctp-overlay1 hover:text-ctp-text text-sm transition-colors"
          >
            {"<-"} back to void
          </Link>
        </div>
      </div>
    </main>
  );
}
