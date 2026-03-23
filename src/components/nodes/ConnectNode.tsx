import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ASTNode } from "@/lib/ast-types";

interface ConnectNodeProps {
  node: ASTNode;
}

// ── Icon components (simple SVG) ───────────────────────────────────────
function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function getIcon(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes("github")) return <GitHubIcon />;
  if (lower.includes("linkedin")) return <LinkedInIcon />;
  if (lower.includes("email") || lower.includes("mail")) return <EmailIcon />;
  return null;
}

export function ConnectNode({ node }: ConnectNodeProps) {
  const children = node.children ?? [];
  const bodyParagraphs = node.content?.body?.split("\n\n").filter(Boolean) ?? [];

  return (
    <article className="space-y-8">
      {/* Export declaration header */}
      <header className="space-y-3">
        <div className="font-mono">
          <span className="text-ctp-mauve">export</span>
          <span className="text-ctp-overlay1">{" { "}</span>
          {children.map((child, i) => (
            <span key={child.id}>
              {i > 0 && <span className="text-ctp-overlay1">, </span>}
              <span className="text-ctp-green">{child.label.toLowerCase()}</span>
            </span>
          ))}
          <span className="text-ctp-overlay1">{" } "}</span>
          <span className="text-ctp-mauve">from</span>{" "}
          <span className="text-ctp-green">&quot;rajat&quot;</span>
        </div>

        {node.content?.summary && (
          <p className="text-ctp-subtext0 text-sm font-mono pl-6">
            {"// "}{node.content.summary}
          </p>
        )}
      </header>

      {/* Description */}
      {bodyParagraphs.length > 0 && (
        <div className="space-y-4">
          {bodyParagraphs.map((paragraph, i) => (
            <p key={i} className="text-ctp-text text-sm leading-7">
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {/* Connect links as named exports */}
      <div className="space-y-4">
        {children.map((child) => {
          const url = child.meta?.links?.[0]?.url;
          const icon = getIcon(child.label);

          return (
            <div
              key={child.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border transition-all duration-200",
                "bg-ctp-surface0/30 border-ctp-green/20",
                url && "hover:bg-ctp-surface0/60 hover:border-ctp-green/40",
              )}
            >
              {icon && (
                <span className="text-ctp-green shrink-0">
                  {icon}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm">
                  <span className="text-ctp-mauve">export const</span>{" "}
                  <span className="text-ctp-green font-medium">{child.label.toLowerCase()}</span>
                  <span className="text-ctp-overlay1">{" = "}</span>
                  {url ? (
                    <Link
                      href={url}
                      target={url.startsWith("mailto:") ? undefined : "_blank"}
                      rel={url.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                      className="text-ctp-blue hover:text-ctp-sapphire transition-colors underline underline-offset-4 decoration-ctp-blue/30 hover:decoration-ctp-sapphire/50"
                    >
                      &quot;{url}&quot;
                    </Link>
                  ) : (
                    <span className="text-ctp-text">&quot;{child.label}&quot;</span>
                  )}
                </div>
                {child.content?.summary && (
                  <p className="text-xs text-ctp-subtext0 mt-1">
                    {child.content.summary}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fork CTA */}
      <div className="border-t border-ctp-surface0 pt-8">
        <div className="p-4 rounded-lg border border-ctp-surface1 bg-ctp-surface0/20">
          <p className="text-sm font-mono text-ctp-overlay1 mb-2">
            {"// interested in how this portfolio works?"}
          </p>
          <Link
            href="https://github.com/rajatkumar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono text-ctp-green hover:text-ctp-teal transition-colors underline underline-offset-4"
          >
            fork this tree
          </Link>
        </div>
      </div>
    </article>
  );
}
