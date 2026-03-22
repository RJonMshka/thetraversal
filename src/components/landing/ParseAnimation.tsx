"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Phase = "idle" | "lex" | "parse" | "eval" | "done";

// Token colors for the lex phase
const TOKEN_COLORS = [
  "text-ctp-peach",
  "text-ctp-mauve",
  "text-ctp-green",
  "text-ctp-blue",
  "text-ctp-yellow",
  "text-ctp-teal",
  "text-ctp-red",
  "text-ctp-pink",
  "text-ctp-lavender",
  "text-ctp-sapphire",
];

interface LexToken {
  char: string;
  color: string;
  delay: number;
}

// AST-like structure tokens for the parse phase
const PARSE_NODES = [
  { type: "Program", indent: 0 },
  { type: "ExpressionStatement", indent: 1 },
  { type: "CallExpression", indent: 2 },
  { type: "Identifier: 'traverse'", indent: 3 },
  { type: "Arguments", indent: 3 },
  { type: "ObjectExpression", indent: 4 },
  { type: "Property: 'visitor'", indent: 5 },
  { type: "StringLiteral: 'you'", indent: 6 },
];

// Final eval output lines
const EVAL_LINES = [
  { text: "// Evaluation complete.", color: "text-ctp-overlay1" },
  { text: "", color: "" },
  { text: "Welcome to the Traversal.", color: "text-ctp-text" },
  { text: "You are the observer. The tree is the world.", color: "text-ctp-subtext0" },
  { text: "Every node is a function. Every visit changes state.", color: "text-ctp-subtext0" },
];

interface ParseAnimationProps {
  isActive: boolean;
}

export function ParseAnimation({ isActive }: ParseAnimationProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [lexTokens, setLexTokens] = useState<LexToken[]>([]);
  const [visibleParseNodes, setVisibleParseNodes] = useState(0);
  const [visibleEvalLines, setVisibleEvalLines] = useState(0);

  const inputText = "traverse(portfolio)";

  // Generate lex tokens from input
  const generateLexTokens = useCallback((): LexToken[] => {
    return inputText.split("").map((char, i) => ({
      char,
      color: char === " " ? "" : TOKEN_COLORS[i % TOKEN_COLORS.length],
      delay: i * 0.04,
    }));
  }, []);

  // Phase sequencing
  useEffect(() => {
    if (!isActive) return;

    setPhase("lex");
    setLexTokens(generateLexTokens());

    // lex -> parse transition
    const parseTimer = setTimeout(() => {
      setPhase("parse");
    }, 1500);

    // parse -> eval transition
    const evalTimer = setTimeout(() => {
      setPhase("eval");
    }, 3500);

    // eval -> done transition
    const doneTimer = setTimeout(() => {
      setPhase("done");
    }, 5500);

    return () => {
      clearTimeout(parseTimer);
      clearTimeout(evalTimer);
      clearTimeout(doneTimer);
    };
  }, [isActive, generateLexTokens]);

  // Animate parse nodes appearing one by one
  useEffect(() => {
    if (phase !== "parse") return;

    setVisibleParseNodes(0);
    const intervals: NodeJS.Timeout[] = [];

    PARSE_NODES.forEach((_, i) => {
      const timer = setTimeout(() => {
        setVisibleParseNodes((prev) => prev + 1);
      }, i * 200);
      intervals.push(timer);
    });

    return () => intervals.forEach(clearTimeout);
  }, [phase]);

  // Animate eval lines appearing one by one
  useEffect(() => {
    if (phase !== "eval") return;

    setVisibleEvalLines(0);
    const intervals: NodeJS.Timeout[] = [];

    EVAL_LINES.forEach((_, i) => {
      const timer = setTimeout(() => {
        setVisibleEvalLines((prev) => prev + 1);
      }, i * 300);
      intervals.push(timer);
    });

    return () => intervals.forEach(clearTimeout);
  }, [phase]);

  if (!isActive && phase === "idle") return null;

  return (
    <div className="w-full max-w-2xl mx-auto px-6 font-mono text-sm">
      <AnimatePresence mode="wait">
        {/* LEX PHASE */}
        {phase === "lex" && (
          <motion.div
            key="lex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            <div className="text-ctp-overlay1 text-xs tracking-wider uppercase">
              {"// lexing..."}
            </div>
            <div className="flex flex-wrap">
              {lexTokens.map((token, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: token.delay,
                    duration: 0.15,
                    ease: "easeOut",
                  }}
                  className={cn(
                    "text-lg",
                    token.color,
                    token.char === " " ? "w-2" : ""
                  )}
                >
                  {token.char}
                </motion.span>
              ))}
            </div>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="h-px bg-ctp-surface1 origin-left mt-2"
            />
          </motion.div>
        )}

        {/* PARSE PHASE */}
        {phase === "parse" && (
          <motion.div
            key="parse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-1"
          >
            <div className="text-ctp-overlay1 text-xs tracking-wider uppercase mb-3">
              {"// parsing..."}
            </div>
            {PARSE_NODES.slice(0, visibleParseNodes).map((node, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{ paddingLeft: `${node.indent * 1.5}rem` }}
                className="text-ctp-mauve"
              >
                <span className="text-ctp-overlay0">{"{"}</span>{" "}
                <span className="text-ctp-yellow">type</span>
                <span className="text-ctp-overlay0">{": "}</span>
                <span className="text-ctp-green">{`"${node.type}"`}</span>{" "}
                <span className="text-ctp-overlay0">{"}"}</span>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* EVAL PHASE */}
        {(phase === "eval" || phase === "done") && (
          <motion.div
            key="eval"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-2"
          >
            <div className="text-ctp-overlay1 text-xs tracking-wider uppercase mb-3">
              {"// evaluating..."}
            </div>
            {EVAL_LINES.slice(0, visibleEvalLines).map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={cn(
                  line.color,
                  line.text === "" ? "h-3" : "",
                  i === 2 ? "text-base font-medium" : ""
                )}
              >
                {line.text}
              </motion.p>
            ))}

            {/* CTA — appears in "done" phase */}
            {phase === "done" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                className="pt-6"
              >
                <Link
                  href="/tree"
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2",
                    "border border-ctp-surface1 rounded",
                    "text-ctp-green hover:text-ctp-green hover:border-ctp-green",
                    "transition-colors duration-200",
                    "focus-visible:outline-ctp-lavender"
                  )}
                >
                  <span className="text-ctp-overlay0">{"$"}</span>
                  <span>Begin Traversal</span>
                  <span className="text-ctp-overlay0 animate-cursor-blink">
                    {"_"}
                  </span>
                </Link>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
