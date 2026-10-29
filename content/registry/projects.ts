import type { SourceEntity } from "@tv/ir";

// ── Project registry ───────────────────────────────────────────────────
// Mirrors docs/CONTENT-v2.md §2 and §3. `stack` is the tech stack.
//
// PUBLICATION POLICY (CONTENT-v2 §0, set 2026-08-04)
// A project renders only when it has a publicly verifiable artifact:
// a public repo, a published package, a live site, or a written document.
// Everything else stays fully written here with `status: "draft"` so it
// can be flipped the moment the repo opens. An unlinkable project card
// invites a click that goes nowhere.
//
// Nothing is ever deleted from this registry, only unpublished. The
// section lists every project; the compiler drops drafts.

export const PROJECTS: SourceEntity[] = [
  // ── Published ──────────────────────────────────────────────────────────
  {
    id: "reachble",
    kind: "project",
    label: "Reachble",
    summary: "Auto-generated VEX for npm projects, backed by reachability analysis.",
    excerpt: "Most CVEs flagged in a package-lock.json aren't exploitable — research puts 60–80% in dependency code paths that are never called. Reachble traces call paths to the specific vulnerable symbol and emits CycloneDX VEX + OpenVEX with machine-checkable evidence.\n\nVerdicts are tiered by how the vulnerable symbol is actually reached: CRITICAL from unauthenticated external input, HIGH from an authenticated route or internal service, LOW reachable with no external input path, SAFE never reached at all — which is the case that earns a VEX not_affected.",
    tags: ["security", "supply-chain", "sbom", "vex", "static-analysis", "open-source"],
    stack: ["TypeScript", "Node.js", "CycloneDX", "OpenVEX"],
    links: [
      { label: "GitHub", url: "https://github.com/RJonMshka/Reachble" },
    ],
    status: "published",
  },
  {
    id: "mfkit",
    kind: "project",
    label: "MFKit",
    summary: "Polyglot Module Federation, scaffolded and self-healing.",
    excerpt: "A framework for production microfrontend architectures where every MFE can run a different framework — React, Svelte, Vue, Angular, Lit — while the system stays coherent at runtime.\n\nShips as a monorepo: @mfkit/plugin-api (the stable TypeScript contract every layer implements), @mfkit/kit (runtime, Vite config generation, self-healing primitives, MFKitOutlet), @mfkit/codemods, create-mfkit, and per-framework template packages.\n\nModule Federation solves loading, not operating. The hard parts are what happens when one team's MFE breaks in production, when frameworks diverge, and when a new team needs to stand up an MFE without reverse-engineering the shell.",
    tags: ["micro-frontends", "module-federation", "architecture", "developer-experience", "ai-tooling"],
    stack: ["TypeScript", "Vite", "Module Federation", "pnpm"],
    links: [
      { label: "GitHub", url: "https://github.com/RJonMshka/mfkit" },
    ],
    status: "published",
  },
  {
    id: "resumind",
    kind: "project",
    label: "RESUMIND",
    summary: "Resume optimizer. Takes a resume and a target job description, returns structured suggestions through domain-specific prompt rules and structured Claude output pipelines.",
    excerpt: "Next.js + TypeScript + Claude API + MCP. Domain-specific prompt rules constrain the analysis; structured output pipelines keep every suggestion parseable and renderable.",
    tags: ["ai", "llm", "mcp", "career-tools", "full-stack"],
    stack: ["Next.js", "TypeScript", "Claude API", "MCP"],
    links: [
      { label: "GitHub", url: "https://github.com/RJonMshka/resumind" },
    ],
    status: "published",
  },
  {
    id: "thetraversal",
    kind: "project",
    label: "The Traversal",
    summary: "This site. A portfolio structured as a traversable AST.",
    excerpt: "Not a portfolio in the conventional sense. A traversal — a walk through a graph of ideas, projects, and identities. Nodes are concepts. Edges are relationships. The visitor is the runtime.\n\nThree layers carry the metaphor: Brahman, the undifferentiated source; Maya, the projected world of skills, tools, and output; Atman, the self navigating between them. The AST framing is load-bearing, not decoration.\n\nThe same content renders at three depths — lex, parse, eval — because that is what a compiler does with a source file.",
    tags: ["compilers", "ast", "next-js", "design", "open-source"],
    stack: ["Next.js", "TypeScript", "D3", "Framer Motion", "MDX"],
    links: [
      { label: "GitHub", url: "https://github.com/RJonMshka/thetraversal" },
    ],
    status: "published",
  },
  // ── Unpublished: private repos, awaiting a public artifact ────────────
  {
    id: "dev-session",
    kind: "project",
    label: "dev-session",
    summary: "A context engine for long AI coding sessions.",
    excerpt: "Treats the model's context window as a managed workspace rather than an accumulating buffer. Three primitives — Loader, Session State, and Eviction — govern what enters context, what persists across turns, and what gets dropped, so a long session finishes without drift.\n\nv2 introduces selective file-layer loading through JSDoc-style annotations: layers are declared, not dumped.",
    tags: ["ai-tooling", "context-engineering", "agents", "developer-experience"],
    stack: ["TypeScript", "npm"],
    status: "draft",
  },
  {
    id: "devnexus",
    kind: "project",
    label: "DevNexus",
    summary: "Reference architecture for production micro frontend systems.",
    excerpt: "Runtime composition, shared design tokens, typed shell-to-MFE contracts, and bundle-splitting strategy for multi-team organizations. Distilled from real Module Federation architecture work at Capital One.\n\nConsumes @mfkit/* as the canonical example app and doubles as MFKit's integration test. Most micro frontend writing is either vendor marketing or a toy demo; this is the version that survived a regulated production environment.",
    tags: ["micro-frontends", "module-federation", "architecture", "frontend"],
    stack: ["React", "TypeScript", "Webpack 5", "Module Federation"],
    status: "draft",
  },
  {
    id: "photovault",
    kind: "project",
    label: "PhotoVault",
    summary: "Spotlight for a sprawling local photo archive. Entirely on-device.",
    excerpt: "Natural-language and OCR search across every photo on every disk you own. CLIP embeddings power semantic search, a parallel OCR index handles text inside images, and a FAISS index sits alongside SQLite metadata. No cloud, no telemetry, no accounts — the only network call in the system is the one-time model download.\n\nThe interesting constraint is the FAISS ⇄ SQLite coupling: the embedding id is a positional row index into the flat index, so removing a vector means rebuilding and rewriting every id. Deletes are soft with periodic rebuilds; the alternative is search silently returning the wrong photos.",
    tags: ["local-first", "privacy", "clip", "embeddings", "vector-search", "ocr", "on-device-ml"],
    stack: ["Python", "CLIP", "FAISS", "SQLite", "FastAPI", "React"],
    status: "draft",
  },
  {
    id: "kata",
    kind: "project",
    label: "Kata",
    summary: "The spec is the IR; the renderer is the codegen.",
    excerpt: "An interview practice environment where the workspace itself is data. An LLM emits a typed WorkspaceSpec — a Zod-defined, kind-tagged discriminated union — and a deterministic renderer instantiates the matching environment. Adding a round type means adding a union variant and one line in the renderer registry.\n\nThe pipeline is a sequence of pure typed transforms, so the whole thing is testable end to end without ever calling a model. Coding specs ship a reference solution executed against the spec's own test cases before the spec is allowed through — that check is the system's central reliability mechanism.",
    tags: ["ai-tooling", "compilers", "ir", "typed-architecture", "llm", "structured-outputs"],
    stack: ["Next.js", "React", "TypeScript", "Zod", "Pyodide", "Claude API"],
    status: "draft",
  },
  {
    id: "stemforge",
    kind: "project",
    label: "StemForge",
    summary: "Offline stem separation as a native audio plugin. No cloud, no upload.",
    excerpt: "A VST3/AU/Standalone plugin that separates a finished song into vocals, drums, and bass by running a deep-learning separation model through ONNX Runtime in C++. The pipeline is model-agnostic; weights never enter git.\n\nAudio-thread discipline is the whole game: never block, allocate, lock, or do I/O on the audio thread. Inference runs on a background thread and never touches it. No exceptions cross the plugin boundary — a thrown exception can take the host DAW down with it.",
    tags: ["cpp", "juce", "audio", "dsp", "onnx", "ml-inference", "native"],
    stack: ["C++17", "JUCE 8", "ONNX Runtime", "CMake"],
    status: "draft",
  },
  {
    id: "clause",
    kind: "project",
    label: "Clause",
    summary: "English-like functional language compiling to JavaScript. Lexer, parser, typed IR, and code generator built from scratch.",
    excerpt: "Where compiler theory meets language design philosophy. Direct descendant of the Scala OO DSL built during the UIC MS.\n\n\"If a language is how you think, Clause is an experiment in thinking differently.\"",
    tags: ["compilers", "languages", "go", "javascript"],
    stack: ["Go", "Custom IR", "JS Codegen"],
    status: "draft",
  },
  {
    id: "neuralui",
    kind: "project",
    label: "NeuralUI",
    summary: "Framework-agnostic browser-native LLM inference library with a middleware pipeline and extension system.",
    excerpt: "RFC/design stage. Targets in-browser inference: no server, no API key, no round trip.",
    tags: ["llm", "webgpu", "browser", "inference"],
    stack: ["TypeScript", "WebGPU"],
    status: "draft",
  },
  {
    id: "plviz",
    kind: "project",
    label: "Programming Language Visualizer",
    summary: "Make the invisible visible: lexing, parsing, and scope resolution in real time.",
    excerpt: "Watch a lexer tokenize in real time, see a parse tree form node by node, trace a variable resolving through a scope chain. Same obsession that produced Clause.",
    tags: ["compilers", "visualization", "education"],
    status: "draft",
  },
  {
    id: "ai-crm",
    kind: "project",
    label: "AI-Powered CRM",
    summary: "Full-stack CRM with LLM-driven task generation over MCP.",
    excerpt: "One of the first builds where MCP was a first-class architectural primitive rather than an add-on — not just development tooling, but part of the production data access layer.",
    tags: ["full-stack", "ai", "mcp", "graphql", "crm"],
    stack: ["Next.js", "TypeScript", "GraphQL", "PostgreSQL", "Bun", "Claude API", "MCP"],
    status: "draft",
  },
  {
    id: "rl-trading",
    kind: "project",
    label: "RL Financial Trading",
    summary: "Policy-gradient reinforcement learning agent for equities trading.",
    excerpt: "Trained and back-tested on real historical market data. Beat the baseline strategy by roughly 30% on returns. UIC MS.",
    tags: ["reinforcement-learning", "research", "finance"],
    stack: ["Python", "TensorFlow"],
    status: "draft",
  },
  {
    id: "grpc-logs",
    kind: "project",
    label: "gRPC Log Processing",
    summary: "Distributed log pipeline with a gRPC client-server core and serverless processing.",
    excerpt: "Scala, Akka HTTP, AWS Lambda, EC2, S3, and API Gateway. UIC MS.",
    tags: ["distributed-systems", "grpc", "scala", "aws"],
    stack: ["Scala", "Akka HTTP", "AWS Lambda"],
    status: "draft",
  },
  {
    id: "scala-dsl",
    kind: "project",
    label: "Object-Oriented DSL in Scala",
    summary: "Set operations plus full OO constructs, implemented as a language from scratch.",
    excerpt: "Variables, macros, classes, interfaces, inheritance, composition, dynamic dispatch, and partial evaluation. The direct ancestor of Clause.",
    tags: ["languages", "scala", "dsl"],
    stack: ["Scala"],
    status: "draft",
  },
];

export const PROJECTS_SECTION: SourceEntity = {
  id: "projects",
  kind: "section",
  label: "Projects",
  summary: "Callable units of work, each with a public artifact behind it.",
  excerpt: "FunctionDeclarations — defined inputs, defined outputs. Only projects with something publicly verifiable appear here: a public repo, a published package, a live site. The rest are written up and waiting on their repos to open.",
  tags: ["projects"],
  children: PROJECTS.map((p) => p.id),
};
