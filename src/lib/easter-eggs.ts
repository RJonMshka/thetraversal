export interface EasterEggResult {
  type: "json" | "text" | "lines";
  content: string | string[];
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
      "  sudo hire rajat         — attempt privilege escalation",
      "  clear                   — clear the terminal",
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
      "",
      "— Rajat",
    ],
  }),

  "cat readme": () => commands["cat README"](),
  "cat README.md": () => commands["cat README"](),

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
