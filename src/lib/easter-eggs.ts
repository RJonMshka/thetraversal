import { RESUME_TEXT_LINES } from "@/data/resume";

export interface EasterEggAction {
  kind: "download" | "navigate";
  url: string;
}

export interface EasterEggResult {
  type: "json" | "text" | "lines" | "action";
  content: string | string[];
  action?: EasterEggAction;
}

const RAJAT_PROFILE = {
  name: "Rajat Kumar",
  type: "FunctionDeclaration",
  role: "Software Engineer",
  traits: [
    "systems-thinker",
    "detail-oriented",
    "philosophy-adjacent",
    "perpetually-curious",
  ],
  stack: ["TypeScript", "React", "Next.js", "Node.js", "Python"],
  philosophy: "The medium is the message",
  currently: "building this portfolio as an AST",
  fun_fact: "You found the easter egg. You're my kind of person.",
};

const commands: Record<string, () => EasterEggResult> = {
  "console.log(rajat)": () => ({
    type: "json",
    content: JSON.stringify(RAJAT_PROFILE, null, 2),
  }),

  help: () => ({
    type: "lines",
    content: [
      "Available commands:",
      "",
      "  help                    — you're looking at it",
      "  ls                      — list the contents",
      "  cat README              — read the readme",
      "  console.log(rajat)      — inspect the developer",
      "  resume                  — download the resume",
      "  cat resume              — view the resume inline",
      "  open resume             — open the resume page",
      "  sudo hire rajat         — attempt privilege escalation",
      "  clear                   — clear the terminal",
      "",
      "  theme <name>            — change theme (mint amber ice mono paper linen bone chalk sun)",
      "  font <name>             — change font (mono serif brutalist)",
      "  reset                   — reset to defaults (mint + mono)",
      "",
      "Or just type anything and press Enter to begin the traversal.",
    ],
  }),

  ls: () => ({
    type: "lines",
    content: [
      "drwxr-xr-x  projects/",
      "drwxr-xr-x  skills/",
      "drwxr-xr-x  philosophy/",
      "drwxr-xr-x  timeline/",
      "-rw-r--r--  README.md",
      "-rw-r--r--  rajat.json",
      "-rw-r--r--  resume.pdf",
      "-rw-r--r--  resume.docx",
    ],
  }),

  "cat README": () => ({
    type: "lines",
    content: [
      "# The Traversal",
      "",
      "You're standing at the root node of an Abstract Syntax Tree.",
      "This isn't a portfolio — it's a program that describes a person.",
      "",
      "Type anything. Press Enter. The parsing begins.",
      "Type `resume` to download, `cat resume` to view inline.",
      "",
      "— Rajat",
    ],
  }),

  "cat readme": () => commands["cat README"](),
  "cat README.md": () => commands["cat README"](),

  resume: () => ({
    type: "action",
    content: [
      "Downloading resume...",
      "",
      "→ rajat-kumar-resume.pdf",
    ],
    action: { kind: "download", url: "/resume/rajat-kumar-resume.pdf" },
  }),

  "cat resume": () => ({
    type: "lines",
    content: RESUME_TEXT_LINES,
  }),

  "open resume": () => ({
    type: "action",
    content: [
      "Opening resume node...",
    ],
    action: { kind: "navigate", url: "/node/resume" },
  }),

  "sudo hire rajat": () => ({
    type: "lines",
    content: [
      "[sudo] password for visitor: ********",
      "",
      "Permission granted.",
      "",
      "Rajat has been added to your team.",
      "Effective immediately.",
      "",
      "(Just kidding. But seriously, let's talk.)",
    ],
  }),

  clear: () => ({
    type: "text",
    content: "__CLEAR__",
  }),

  whoami: () => ({
    type: "text",
    content: "visitor — traversing the AST since just now",
  }),

  pwd: () => ({
    type: "text",
    content: "/root/the-traversal",
  }),

  exit: () => ({
    type: "text",
    content: "There is no exit. Only deeper traversal.",
  }),
};

export function getEasterEgg(input: string): EasterEggResult | null {
  const trimmed = input.trim();
  return commands[trimmed]?.() ?? null;
}

export function isNavigationCommand(input: string): boolean {
  const trimmed = input.trim().toLowerCase();
  return trimmed !== "" && !commands[trimmed] && trimmed !== "clear";
}
