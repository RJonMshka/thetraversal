"use client";

import { cn } from "@/lib/utils";
import type { ASTNode } from "@/lib/ast-types";

interface ResumeNodeProps {
  node: ASTNode;
}

export function ResumeNode({ node }: ResumeNodeProps) {
  const links = node.meta?.links ?? [];
  const pdfLink = links.find((l) => l.url.endsWith(".pdf"));
  const docxLink = links.find((l) => l.url.endsWith(".docx"));

  return (
    <article className="space-y-8">
      {/* Import declaration header */}
      <header className="space-y-3">
        <div className="font-mono">
          <span className="text-ctp-mauve">import</span>{" "}
          <span className="text-ctp-yellow text-xl font-bold">resume</span>{" "}
          <span className="text-ctp-mauve">from</span>{" "}
          <span className="text-ctp-green">&quot;./rajat-kumar.pdf&quot;</span>
        </div>

        {node.content?.summary && (
          <p className="text-ctp-subtext0 text-sm font-mono">
            {"// "}{node.content.summary}
          </p>
        )}
      </header>

      {/* Download bar — styled as export statements */}
      <div className="flex flex-wrap gap-3">
        {pdfLink && (
          <a
            href={pdfLink.url}
            download="rajat-kumar-resume.pdf"
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-md font-mono text-sm",
              "bg-ctp-surface0 border border-ctp-yellow/30",
              "text-ctp-yellow hover:border-ctp-yellow/60 hover:bg-ctp-surface1",
              "transition-all duration-200",
            )}
            aria-label="Download resume as PDF"
          >
            <span className="text-ctp-mauve">export</span>{" "}
            <span className="text-ctp-text">{"{"}</span>{" "}
            <span className="text-ctp-yellow">resume</span>{" "}
            <span className="text-ctp-text">{"}"}</span>{" "}
            <span className="text-ctp-mauve">from</span>{" "}
            <span className="text-ctp-green">&quot;pdf&quot;</span>
          </a>
        )}
        {docxLink && (
          <a
            href={docxLink.url}
            download="rajat-kumar-resume.docx"
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-md font-mono text-sm",
              "bg-ctp-surface0 border border-ctp-yellow/30",
              "text-ctp-yellow hover:border-ctp-yellow/60 hover:bg-ctp-surface1",
              "transition-all duration-200",
            )}
            aria-label="Download resume as DOCX"
          >
            <span className="text-ctp-mauve">export</span>{" "}
            <span className="text-ctp-text">{"{"}</span>{" "}
            <span className="text-ctp-yellow">resume</span>{" "}
            <span className="text-ctp-text">{"}"}</span>{" "}
            <span className="text-ctp-mauve">from</span>{" "}
            <span className="text-ctp-green">&quot;docx&quot;</span>
          </a>
        )}
      </div>

      {/* Inline PDF viewer — desktop only */}
      {pdfLink && (
        <div className="space-y-2">
          <span className="text-xs font-mono text-ctp-overlay0">
            {"// inline viewer"}
          </span>

          {/* Desktop: embedded PDF */}
          <div className="hidden md:block">
            <object
              data={pdfLink.url}
              type="application/pdf"
              className="w-full rounded-md border border-ctp-surface1"
              style={{ height: "70vh" }}
              aria-label="Resume PDF viewer"
            >
              <p className="p-4 text-ctp-subtext0 text-sm font-mono">
                Your browser does not support inline PDF viewing.{" "}
                <a
                  href={pdfLink.url}
                  download="rajat-kumar-resume.pdf"
                  className="text-ctp-blue hover:text-ctp-sapphire underline underline-offset-4"
                >
                  Download the PDF
                </a>{" "}
                instead.
              </p>
            </object>
          </div>

          {/* Mobile: download prompt instead of broken viewer */}
          <div className="md:hidden p-6 rounded-md border border-ctp-surface1 bg-ctp-mantle text-center space-y-4">
            <p className="text-ctp-subtext0 text-sm font-mono">
              Inline PDF viewing is not supported on mobile.
            </p>
            <a
              href={pdfLink.url}
              download="rajat-kumar-resume.pdf"
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-md font-mono text-sm",
                "bg-ctp-surface0 border border-ctp-yellow/30",
                "text-ctp-yellow hover:border-ctp-yellow/60",
                "transition-all duration-200",
              )}
              aria-label="Download resume as PDF"
            >
              Download PDF
            </a>
          </div>
        </div>
      )}

      {/* Body content */}
      {node.content?.body && (
        <div className="space-y-4">
          {node.content.body.split("\n\n").filter(Boolean).map((paragraph, i) => (
            <p key={i} className="text-ctp-text text-sm leading-7">
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </article>
  );
}
