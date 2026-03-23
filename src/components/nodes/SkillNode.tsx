"use client";

import { cn } from "@/lib/utils";
import type { ASTNode } from "@/lib/ast-types";

interface SkillNodeProps {
  node: ASTNode;
}

// ── Skill bar component ────────────────────────────────────────────────
interface SkillBarProps {
  name: string;
  proficiency: number;
  years: number;
}

function SkillBar({ name, proficiency, years }: SkillBarProps) {
  return (
    <div className="group space-y-1.5">
      <div className="flex items-center justify-between text-sm font-mono">
        <span className="text-ctp-text">{name}</span>
        <span className="text-ctp-overlay0 text-xs">
          {proficiency}% · {years}y
        </span>
      </div>
      <div className="h-2 rounded-full bg-ctp-surface0 overflow-hidden">
        <div
          className="h-full rounded-full bg-ctp-mauve/80 transition-all duration-700 ease-out group-hover:bg-ctp-mauve"
          style={{ width: `${proficiency}%` }}
        />
      </div>
    </div>
  );
}

// ── Parse proficiency from content summary ─────────────────────────────
function parseSkillData(child: ASTNode): SkillBarProps | null {
  if (!child.content?.summary) return null;

  // Pattern: "92% proficiency · 4 years"
  const match = child.content.summary.match(/(\d+)%\s*proficiency\s*·\s*(\d+)\s*year/);
  if (!match) return null;

  return {
    name: child.label,
    proficiency: parseInt(match[1], 10),
    years: parseInt(match[2], 10),
  };
}

export function SkillNode({ node }: SkillNodeProps) {
  const children = node.children ?? [];
  const bodyParagraphs = node.content?.body?.split("\n\n").filter(Boolean) ?? [];

  return (
    <article className="space-y-8">
      {/* Object expression header */}
      <header className="space-y-3">
        <div className="font-mono">
          <span className="text-ctp-mauve">const</span>{" "}
          <span className="text-ctp-mauve text-xl font-bold">
            {node.label.toLowerCase()}
          </span>
          <span className="text-ctp-overlay1">: </span>
          <span className="text-ctp-yellow">ObjectExpression</span>
          <span className="text-ctp-overlay1">{" = {"}</span>
        </div>

        {node.content?.summary && (
          <p className="text-ctp-subtext0 text-sm font-mono pl-6">
            {"// "}{node.content.summary}
          </p>
        )}
      </header>

      {/* Description */}
      {bodyParagraphs.length > 0 && (
        <div className="pl-6 space-y-4">
          {bodyParagraphs.map((paragraph, i) => (
            <p key={i} className="text-ctp-text text-sm leading-7">
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {/* Skill bars */}
      {children.length > 0 && (
        <div className="pl-6 space-y-4">
          {children.map((child) => {
            const data = parseSkillData(child);
            if (!data) return null;
            return <SkillBar key={child.id} {...data} />;
          })}
        </div>
      )}

      {/* Closing brace */}
      <div className="font-mono">
        <span className="text-ctp-overlay1">{"}"}</span>
      </div>
    </article>
  );
}
