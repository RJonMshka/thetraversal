# AGENTS.md — The Traversal

## Project Identity

**The Traversal** — Rajat's interactive AST-based developer portfolio. Not a conventional portfolio. Visitors traverse an Abstract Syntax Tree to discover who Rajat is. The architecture, metaphor, and philosophy are inseparable — the medium is the message.

Three conceptual layers from Advaita Vedanta:
- **Brahman (Source):** Landing page — a single cursor, undifferentiated potential.
- **Maya (Manifest World):** The AST — structured nodes of projects, skills, philosophy, timeline.
- **Atman (Observer):** The visitor — accumulates a "context window" as they traverse.

See `docs/PLAN.md` for the phased implementation roadmap.

## Build / Dev / Lint / Test Commands

```bash
pnpm install              # Install deps (NEVER use npm or yarn)
pnpm dev                  # Next.js dev server (http://localhost:3000)
pnpm build                # Production build — must pass with zero errors
pnpm lint                 # ESLint (Next.js built-in config)
pnpm type-check           # tsc --noEmit
pnpm test                 # Full test suite (Vitest)
pnpm test -- <file>       # Single test file
pnpm test -- -t "name"    # Tests matching a name pattern
```

Run `pnpm build` before considering any phase complete.
Run `pnpm type-check` after modifying types in `src/lib/ast-types.ts`.

## Tech Stack

- **Next.js 14+** (App Router) + **TypeScript** (strict mode)
- **Tailwind CSS v4** with Catppuccin Mocha as CSS custom properties
- **D3.js** for tree layout math only — React renders SVG
- **Framer Motion** for animations
- **Zustand** for global state
- **MDX** for philosophy essays (via @next/mdx or next-mdx-remote)
- **Shiki** + Catppuccin theme for code highlighting
- **pnpm** — never npm or yarn

## Project Structure

```
src/
  app/
    layout.tsx            # Root layout: fonts, theme, metadata
    page.tsx              # Landing page (Brahman layer)
    tree/page.tsx         # AST visualizer (Maya layer)
    node/[slug]/page.tsx  # Node detail pages
    manifest/page.tsx     # Context window summary (Atman layer)
  components/
    ast/                  # ASTCanvas, ASTNode, ASTEdge, ASTMobileTree, TraversalModeSelector
    landing/              # Cursor, ParseAnimation, RootPrompt
    chrome/               # TokenStream, ContextWindow, Header, CommandPalette
    nodes/                # ProjectNode, SkillNode, PhilosophyNode, TimelineNode, etc.
    shared/               # CodeBlock, GlowOrb, Tooltip
  data/                   # AST structure, projects, skills, timeline, philosophy
  content/                # MDX essay files (kebab-case)
  hooks/                  # useTraversalState, useASTLayout, useParseAnimation, useMediaQuery
  lib/                    # ast-types, traversal utils, theme tokens, easter-eggs
  styles/globals.css      # Tailwind directives, CSS custom properties, font-face
```

## AST Data Model

```typescript
type ASTNodeType =
  | 'RootNode' | 'ProgramNode' | 'BlockStatement'
  | 'FunctionDeclaration' | 'ObjectExpression' | 'ExpressionStatement'
  | 'CallExpression' | 'VariableDeclaration' | 'ArrayExpression'
  | 'ExportDeclaration' | 'StringLiteral' | 'ImportDeclaration'
  | 'TypeAnnotation';

interface ASTNode {
  id: string;                // kebab-case
  type: ASTNodeType;
  label: string;             // human-readable display name
  slug: string;              // URL-safe identifier
  glowColor: string;         // CSS custom property name (e.g. "--ctp-peach")
  children?: ASTNode[];
  content?: { summary: string; body: string; deep?: string | null };
  meta?: { tags?: string[]; date?: string; links?: { label: string; url: string }[]; params?: string[] };
}
```

## Traversal Modes

| Mode   | Flag      | Renders                          |
|--------|-----------|----------------------------------|
| Lex    | `--lex`   | Node labels + types only         |
| Parse  | `--parse` | Labels + summaries + structure   |
| Eval   | `--eval`  | Full content, demos, essays      |

Mode persists via URL search params (`?mode=lex|parse|eval`).

## TypeScript Rules

- **Strict mode mandatory.** No `any`, no `@ts-ignore` without justification.
- All AST nodes satisfy `ASTNode` from `src/lib/ast-types.ts`.
- Prefer **discriminated unions**. Use `ASTNodeType` for exhaustive switches.
- Props interfaces **colocated** with the component file.
- Use `satisfies` for typed constants: `const PORTFOLIO_AST = { ... } satisfies ASTNode`.

## Naming Conventions

| Category       | Convention | Example                            |
|----------------|------------|------------------------------------|
| Components     | PascalCase | `ASTCanvas.tsx`, `ProjectNode.tsx` |
| Hooks          | camelCase  | `useTraversalState.ts`             |
| Utilities      | camelCase  | `traversal.ts`, `theme.ts`        |
| Content files  | kebab-case | `code-as-consciousness.mdx`       |
| CSS variables  | `--ctp-*`  | `--ctp-peach`, `--ctp-base`       |
| AST node IDs   | kebab-case | `"resumind"`, `"skills-languages"` |

## Import & Export Rules

- Always use `@/` path alias (mapped to `src/`). No relative `../../` paths.
- Order: React/Next, external deps, `@/lib`, `@/hooks`, `@/components`, `@/data`.
- **Named exports only** for components. No default exports (exception: Next.js pages/layouts).

## Component Rules

- Functional components only. No class components.
- One component per file. Props interface at the top of that file.
- Use `cn()` (clsx + tailwind-merge) for conditional class names.
- Interactive elements must be `<button>` or `<a>`. Never click handlers on `<div>`.
- No unnecessary abstractions — components exist for distinct visual/behavioral units.

## Styling Rules

- Tailwind utilities for layout, spacing, sizing.
- CSS custom properties (`--ctp-*`) for all colors. Never hardcode hex.
- No CSS modules. No styled-components. No inline `style={{}}` except D3 dynamic values.
- Glow effects use the node's `glowColor` property.

### Design Tokens (Catppuccin Mocha)

```
--ctp-base: #1e1e2e   --ctp-mantle: #181825   --ctp-crust: #11111b
--ctp-surface0: #313244   --ctp-surface1: #45475a
--ctp-text: #cdd6f4   --ctp-subtext0: #a6adc8
--ctp-peach: #fab387 (projects)   --ctp-mauve: #cba6f7 (skills)
--ctp-lavender: #b4befe (philosophy)   --ctp-teal: #94e2d5 (timeline)
--ctp-green: #a6e3a1 (connect)   --ctp-red: #f38ba8   --ctp-yellow: #f9e2af
```

### Typography

- **Monospace:** JetBrains Mono (structure, code, labels — self-hosted)
- **Serif:** EB Garamond (philosophy, essays — self-hosted)
- Node type labels: always mono. Essay body: always serif. Everything else: mono.

## State Management

- **Global:** Zustand store (`src/hooks/useTraversalState.ts`) — `visitedNodes`, `currentMode`, `contextWindow`, `expandedNodes`. Persisted to sessionStorage.
- **Local:** React `useState`/`useReducer`, kept in the component.
- Mode synced with URL search params.

## D3.js Integration

- D3 computes layout math only (`d3.tree()`, `d3.hierarchy()`).
- **React renders all SVG.** D3 never touches the DOM.
- Zoom/pan binds to React refs. Transitions use Framer Motion, not d3-transition.

## Animation Rules

- Framer Motion for component animation (spring: stiffness 120, damping 20).
- CSS for ambient effects (glow-pulse: 3s, opacity 0.4-0.7).
- Page transitions: fade + y-translate, 200ms ease-out.
- **Never block interaction.** All animations interruptible.
- Respect `prefers-reduced-motion`: disable glow, parse animation, tree transitions.

## Accessibility

- ARIA `role="tree"` / `role="treeitem"` on AST.
- Keyboard-navigable: Tab, Enter, Arrow keys.
- Focus rings: `--ctp-lavender`.
- SSR all pages — must work with JS disabled for basic content.
- All text on `--ctp-base` meets WCAG AA contrast.

## Performance Budget

- Initial JS: < 200KB gzipped.
- Lazy load: D3 canvas (dynamic import), MDX essays, node deep content.
- Prefetch adjacent nodes on hover via `<Link prefetch>`.
- Lighthouse: >= 95 perf, 100 a11y, 100 best practices, 100 SEO.

## Error Handling

- `findNode` returns null → render 404, never crash.
- Zustand hydration mismatches → `skipHydration` / `onRehydrateStorage`.
- D3 layout edge cases (empty children, single node) → guard in `useASTLayout`.
- MDX load failures → fallback content, never blank page.

## Content Tone

- Labels: terse, technical, AST-accurate (`FunctionDeclaration: "RESUMIND"`).
- Summaries: one sentence, punchy, confident.
- Body: clear, specific, no fluff — documentation with personality.
- Essays: contemplative but rigorous — never vague.
- Easter eggs: witty, self-aware, reward the curious.

## Key Invariants

1. Landing page (`/`): terminal void. One cursor. One prompt. Visitor acts, world unfolds.
2. Mobile list view (`ASTMobileTree`) is first-class, not a degraded fallback.
3. Every node directly linkable: `/node/[slug]`.
4. Context Window persists across navigations (Zustand + sessionStorage).
5. Token stream is interactive — clicking a token navigates to its node.
6. Never auto-play audio/video. Never block navigation with modals.

## Phase Roadmap

Nine phases (see `docs/PLAN.md` for exit criteria):

1. Foundation + Landing page
2. AST data layer + types + Zustand store
3. D3 tree visualizer (desktop) — *after Phase 2*
4. Node detail pages (`/node/[slug]`) — *after Phase 2, parallel with 3 & 6*
5. Token stream + Context window — *after Phase 3*
6. Mobile AST (collapsible list) — *after Phase 2, parallel with 3 & 4*
7. Philosophy essays (MDX) — *after Phase 4*
8. Polish, performance, easter eggs
9. Deploy + launch
