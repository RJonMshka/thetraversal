import type { ASTNode } from "@/lib/ast-types";

// ── Project registry ───────────────────────────────────────────────────
// Mirrors docs/CONTENT-v2.md §2 and §3. Each project is a
// FunctionDeclaration — a callable unit of work. params = tech stack,
// content = description at each traversal depth.
//
// PUBLICATION POLICY (CONTENT-v2 §0, set 2026-08-04)
// A project renders only when it has a publicly verifiable artifact:
// a public repo, a published package, a live site, or a written document.
// Everything else stays fully written here but flagged `publish: false`
// so it can be flipped the moment the repo opens. An unlinkable project
// card invites a click that goes nowhere.
//
// Nothing is ever deleted from this registry — only unpublished.

export interface ProjectEntry {
  node: ASTNode;
  /** Mirrors CONTENT-v2 `publish:`. Only true entries enter the AST. */
  publish: boolean;
}

// ── Published ──────────────────────────────────────────────────────────

export const REACHBLE_NODE = {
  id: "reachble",
  type: "FunctionDeclaration",
  label: "Reachble",
  slug: "reachble",
  glowColor: "--ctp-peach",
  content: {
    summary:
      "Auto-generated VEX for npm projects, backed by reachability analysis.",
    body: "Most CVEs flagged in a package-lock.json aren't exploitable — research puts 60–80% in dependency code paths that are never called. Reachble traces call paths to the specific vulnerable symbol and emits CycloneDX VEX + OpenVEX with machine-checkable evidence.\n\nVerdicts are tiered by how the vulnerable symbol is actually reached: CRITICAL from unauthenticated external input, HIGH from an authenticated route or internal service, LOW reachable with no external input path, SAFE never reached at all — which is the case that earns a VEX not_affected.",
    deep: null,
  },
  meta: {
    tags: [
      "security",
      "supply-chain",
      "sbom",
      "vex",
      "static-analysis",
      "open-source",
    ],
    params: ["TypeScript", "Node.js", "CycloneDX", "OpenVEX"],
    links: [{ label: "GitHub", url: "https://github.com/RJonMshka/Reachble" }],
  },
} satisfies ASTNode;

export const MFKIT_NODE = {
  id: "mfkit",
  type: "FunctionDeclaration",
  label: "MFKit",
  slug: "mfkit",
  glowColor: "--ctp-peach",
  content: {
    summary: "Polyglot Module Federation, scaffolded and self-healing.",
    body: "A framework for production microfrontend architectures where every MFE can run a different framework — React, Svelte, Vue, Angular, Lit — while the system stays coherent at runtime.\n\nShips as a monorepo: @mfkit/plugin-api (the stable TypeScript contract every layer implements), @mfkit/kit (runtime, Vite config generation, self-healing primitives, MFKitOutlet), @mfkit/codemods, create-mfkit, and per-framework template packages.\n\nModule Federation solves loading, not operating. The hard parts are what happens when one team's MFE breaks in production, when frameworks diverge, and when a new team needs to stand up an MFE without reverse-engineering the shell.",
    deep: null,
  },
  meta: {
    tags: [
      "micro-frontends",
      "module-federation",
      "architecture",
      "developer-experience",
      "ai-tooling",
    ],
    params: ["TypeScript", "Vite", "Module Federation", "pnpm"],
    links: [{ label: "GitHub", url: "https://github.com/RJonMshka/mfkit" }],
  },
} satisfies ASTNode;

export const RESUMIND_NODE = {
  id: "resumind",
  type: "FunctionDeclaration",
  label: "RESUMIND",
  slug: "resumind",
  glowColor: "--ctp-peach",
  content: {
    summary:
      "Resume optimizer. Takes a resume and a target job description, returns structured suggestions through domain-specific prompt rules and structured Claude output pipelines.",
    body: "Next.js + TypeScript + Claude API + MCP. Domain-specific prompt rules constrain the analysis; structured output pipelines keep every suggestion parseable and renderable.",
    deep: null,
  },
  meta: {
    tags: ["ai", "llm", "mcp", "career-tools", "full-stack"],
    params: ["Next.js", "TypeScript", "Claude API", "MCP"],
    links: [{ label: "GitHub", url: "https://github.com/RJonMshka/resumind" }],
  },
} satisfies ASTNode;

export const TRAVERSAL_NODE = {
  id: "thetraversal",
  type: "FunctionDeclaration",
  label: "The Traversal",
  slug: "thetraversal",
  glowColor: "--ctp-peach",
  content: {
    summary: "This site. A portfolio structured as a traversable AST.",
    body: "Not a portfolio in the conventional sense. A traversal — a walk through a graph of ideas, projects, and identities. Nodes are concepts. Edges are relationships. The visitor is the runtime.\n\nThree layers carry the metaphor: Brahman, the undifferentiated source; Maya, the projected world of skills, tools, and output; Atman, the self navigating between them. The AST framing is load-bearing, not decoration.\n\nThe same content renders at three depths — lex, parse, eval — because that is what a compiler does with a source file.",
    deep: null,
  },
  meta: {
    tags: ["compilers", "ast", "next-js", "design", "open-source"],
    params: ["Next.js", "TypeScript", "D3", "Framer Motion", "MDX"],
    links: [
      { label: "GitHub", url: "https://github.com/RJonMshka/thetraversal" },
    ],
  },
} satisfies ASTNode;

// ── Unpublished — private repos, awaiting a public artifact ────────────
// Fully written. Flip `publish` in PROJECT_REGISTRY to render.

export const DEV_SESSION_NODE = {
  id: "dev-session",
  type: "FunctionDeclaration",
  label: "dev-session",
  slug: "dev-session",
  glowColor: "--ctp-peach",
  content: {
    summary: "A context engine for long AI coding sessions.",
    body: "Treats the model's context window as a managed workspace rather than an accumulating buffer. Three primitives — Loader, Session State, and Eviction — govern what enters context, what persists across turns, and what gets dropped, so a long session finishes without drift.\n\nv2 introduces selective file-layer loading through JSDoc-style annotations: layers are declared, not dumped.",
    deep: null,
  },
  meta: {
    tags: ["ai-tooling", "context-engineering", "agents", "developer-experience"],
    params: ["TypeScript", "npm"],
  },
} satisfies ASTNode;

export const DEVNEXUS_NODE = {
  id: "devnexus",
  type: "FunctionDeclaration",
  label: "DevNexus",
  slug: "devnexus",
  glowColor: "--ctp-peach",
  content: {
    summary: "Reference architecture for production micro frontend systems.",
    body: "Runtime composition, shared design tokens, typed shell-to-MFE contracts, and bundle-splitting strategy for multi-team organizations. Distilled from real Module Federation architecture work at Capital One.\n\nConsumes @mfkit/* as the canonical example app and doubles as MFKit's integration test. Most micro frontend writing is either vendor marketing or a toy demo; this is the version that survived a regulated production environment.",
    deep: null,
  },
  meta: {
    tags: ["micro-frontends", "module-federation", "architecture", "frontend"],
    params: ["React", "TypeScript", "Webpack 5", "Module Federation"],
  },
} satisfies ASTNode;

export const PHOTOVAULT_NODE = {
  id: "photovault",
  type: "FunctionDeclaration",
  label: "PhotoVault",
  slug: "photovault",
  glowColor: "--ctp-peach",
  content: {
    summary: "Spotlight for a sprawling local photo archive. Entirely on-device.",
    body: "Natural-language and OCR search across every photo on every disk you own. CLIP embeddings power semantic search, a parallel OCR index handles text inside images, and a FAISS index sits alongside SQLite metadata. No cloud, no telemetry, no accounts — the only network call in the system is the one-time model download.\n\nThe interesting constraint is the FAISS ⇄ SQLite coupling: the embedding id is a positional row index into the flat index, so removing a vector means rebuilding and rewriting every id. Deletes are soft with periodic rebuilds; the alternative is search silently returning the wrong photos.",
    deep: null,
  },
  meta: {
    tags: [
      "local-first",
      "privacy",
      "clip",
      "embeddings",
      "vector-search",
      "ocr",
      "on-device-ml",
    ],
    params: ["Python", "CLIP", "FAISS", "SQLite", "FastAPI", "React"],
  },
} satisfies ASTNode;

export const KATA_NODE = {
  id: "kata",
  type: "FunctionDeclaration",
  label: "Kata",
  slug: "kata",
  glowColor: "--ctp-peach",
  content: {
    summary: "The spec is the IR; the renderer is the codegen.",
    body: "An interview practice environment where the workspace itself is data. An LLM emits a typed WorkspaceSpec — a Zod-defined, kind-tagged discriminated union — and a deterministic renderer instantiates the matching environment. Adding a round type means adding a union variant and one line in the renderer registry.\n\nThe pipeline is a sequence of pure typed transforms, so the whole thing is testable end to end without ever calling a model. Coding specs ship a reference solution executed against the spec's own test cases before the spec is allowed through — that check is the system's central reliability mechanism.",
    deep: null,
  },
  meta: {
    tags: [
      "ai-tooling",
      "compilers",
      "ir",
      "typed-architecture",
      "llm",
      "structured-outputs",
    ],
    params: ["Next.js", "React", "TypeScript", "Zod", "Pyodide", "Claude API"],
  },
} satisfies ASTNode;

export const STEMFORGE_NODE = {
  id: "stemforge",
  type: "FunctionDeclaration",
  label: "StemForge",
  slug: "stemforge",
  glowColor: "--ctp-peach",
  content: {
    summary: "Offline stem separation as a native audio plugin. No cloud, no upload.",
    body: "A VST3/AU/Standalone plugin that separates a finished song into vocals, drums, and bass by running a deep-learning separation model through ONNX Runtime in C++. The pipeline is model-agnostic; weights never enter git.\n\nAudio-thread discipline is the whole game: never block, allocate, lock, or do I/O on the audio thread. Inference runs on a background thread and never touches it. No exceptions cross the plugin boundary — a thrown exception can take the host DAW down with it.",
    deep: null,
  },
  meta: {
    tags: ["cpp", "juce", "audio", "dsp", "onnx", "ml-inference", "native"],
    params: ["C++17", "JUCE 8", "ONNX Runtime", "CMake"],
  },
} satisfies ASTNode;

export const CLAUSE_NODE = {
  id: "clause",
  type: "FunctionDeclaration",
  label: "Clause",
  slug: "clause",
  glowColor: "--ctp-peach",
  content: {
    summary:
      "English-like functional language compiling to JavaScript. Lexer, parser, typed IR, and code generator built from scratch.",
    body: "Where compiler theory meets language design philosophy. Direct descendant of the Scala OO DSL built during the UIC MS.\n\n\"If a language is how you think, Clause is an experiment in thinking differently.\"",
    deep: null,
  },
  meta: {
    tags: ["compilers", "languages", "go", "javascript"],
    params: ["Go", "Custom IR", "JS Codegen"],
  },
} satisfies ASTNode;

export const NEURALUI_NODE = {
  id: "neuralui",
  type: "FunctionDeclaration",
  label: "NeuralUI",
  slug: "neuralui",
  glowColor: "--ctp-peach",
  content: {
    summary:
      "Framework-agnostic browser-native LLM inference library with a middleware pipeline and extension system.",
    body: "RFC/design stage. Targets in-browser inference: no server, no API key, no round trip.",
    deep: null,
  },
  meta: {
    tags: ["llm", "webgpu", "browser", "inference"],
    params: ["TypeScript", "WebGPU"],
  },
} satisfies ASTNode;

export const PLVIZ_NODE = {
  id: "plviz",
  type: "FunctionDeclaration",
  label: "Programming Language Visualizer",
  slug: "plviz",
  glowColor: "--ctp-peach",
  content: {
    summary: "Make the invisible visible: lexing, parsing, and scope resolution in real time.",
    body: "Watch a lexer tokenize in real time, see a parse tree form node by node, trace a variable resolving through a scope chain. Same obsession that produced Clause.",
    deep: null,
  },
  meta: {
    tags: ["compilers", "visualization", "education"],
  },
} satisfies ASTNode;

export const AI_CRM_NODE = {
  id: "ai-crm",
  type: "FunctionDeclaration",
  label: "AI-Powered CRM",
  slug: "ai-crm",
  glowColor: "--ctp-peach",
  content: {
    summary:
      "Full-stack CRM with LLM-driven task generation over MCP.",
    body: "One of the first builds where MCP was a first-class architectural primitive rather than an add-on — not just development tooling, but part of the production data access layer.",
    deep: null,
  },
  meta: {
    tags: ["full-stack", "ai", "mcp", "graphql", "crm"],
    params: [
      "Next.js",
      "TypeScript",
      "GraphQL",
      "PostgreSQL",
      "Bun",
      "Claude API",
      "MCP",
    ],
  },
} satisfies ASTNode;

export const RL_TRADING_NODE = {
  id: "rl-trading",
  type: "FunctionDeclaration",
  label: "RL Financial Trading",
  slug: "rl-trading",
  glowColor: "--ctp-peach",
  content: {
    summary:
      "Policy-gradient reinforcement learning agent for equities trading.",
    body: "Trained and back-tested on real historical market data. Beat the baseline strategy by roughly 30% on returns. UIC MS.",
    deep: null,
  },
  meta: {
    tags: ["reinforcement-learning", "research", "finance"],
    params: ["Python", "TensorFlow"],
  },
} satisfies ASTNode;

export const GRPC_LOGS_NODE = {
  id: "grpc-logs",
  type: "FunctionDeclaration",
  label: "gRPC Log Processing",
  slug: "grpc-logs",
  glowColor: "--ctp-peach",
  content: {
    summary:
      "Distributed log pipeline with a gRPC client-server core and serverless processing.",
    body: "Scala, Akka HTTP, AWS Lambda, EC2, S3, and API Gateway. UIC MS.",
    deep: null,
  },
  meta: {
    tags: ["distributed-systems", "grpc", "scala", "aws"],
    params: ["Scala", "Akka HTTP", "AWS Lambda"],
  },
} satisfies ASTNode;

export const SCALA_DSL_NODE = {
  id: "scala-dsl",
  type: "FunctionDeclaration",
  label: "Object-Oriented DSL in Scala",
  slug: "scala-dsl",
  glowColor: "--ctp-peach",
  content: {
    summary:
      "Set operations plus full OO constructs, implemented as a language from scratch.",
    body: "Variables, macros, classes, interfaces, inheritance, composition, dynamic dispatch, and partial evaluation. The direct ancestor of Clause.",
    deep: null,
  },
  meta: {
    tags: ["languages", "scala", "dsl"],
    params: ["Scala"],
  },
} satisfies ASTNode;

// ── The registry ───────────────────────────────────────────────────────

export const PROJECT_REGISTRY: ProjectEntry[] = [
  { node: REACHBLE_NODE, publish: true },
  { node: MFKIT_NODE, publish: true },
  { node: RESUMIND_NODE, publish: true },
  { node: TRAVERSAL_NODE, publish: true },
  // Private repos — see CONTENT-v2 §10 repository visibility audit.
  { node: DEV_SESSION_NODE, publish: false },
  { node: DEVNEXUS_NODE, publish: false },
  { node: PHOTOVAULT_NODE, publish: false },
  { node: KATA_NODE, publish: false },
  { node: STEMFORGE_NODE, publish: false },
  { node: CLAUSE_NODE, publish: false },
  { node: NEURALUI_NODE, publish: false },
  { node: PLVIZ_NODE, publish: false },
  { node: AI_CRM_NODE, publish: false },
  { node: RL_TRADING_NODE, publish: false },
  { node: GRPC_LOGS_NODE, publish: false },
  { node: SCALA_DSL_NODE, publish: false },
];

/** The only projects that reach the AST. */
export const PROJECT_NODES: ASTNode[] = PROJECT_REGISTRY.filter(
  (entry) => entry.publish
).map((entry) => entry.node);
