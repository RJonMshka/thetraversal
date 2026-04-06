# AGENTS.md — The Traversal

## What This Is

AST-based developer portfolio. Visitors traverse an Abstract Syntax Tree to discover Rajat. Medium = message. Three layers: Landing (cursor/void) → AST tree → Node detail. See `docs/PLAN.md` for roadmap.

## HARD RULES — Violating these breaks the project

- **NEVER** use `npm` or `yarn`. Only `pnpm`.
- **NEVER** read or edit `src/content/*.mdx` files — those are essay content, not code.
- **NEVER** read or edit `docs/CONTENT.md` file - this file is not needed now.
- **NEVER** read or edit `public/resume/*` files - these are there to download only.
- **NEVER** hardcode hex colors. Use `--ctp-*` CSS variables only.
- **NEVER** use `any` or `@ts-ignore` without a comment explaining why.
- **NEVER** add default exports to components (exception: Next.js pages/layouts).
- **NEVER** put click handlers on `<div>`. Use `<button>` or `<a>`.
- **NEVER** use CSS modules, styled-components, or inline `style={{}}` (except D3 dynamic values).
- **NEVER** auto-play audio/video or block navigation with modals.
- **NEVER** use relative `../../` imports. Always `@/`.
- **NEVER** let D3 touch the DOM. D3 = layout math only. React renders all SVG.

## Commands

```bash
pnpm dev          # dev server
pnpm build        # MUST pass zero errors before any phase is done
pnpm lint         # ESLint
pnpm type-check   # tsc --noEmit — run after touching src/lib/ast-types.ts
pnpm test         # Vitest
```

## Stack

Next.js 14+ (App Router), TypeScript strict, Tailwind v4, D3 (layout only), Framer Motion, Zustand, MDX (essays), Shiki (code highlight), pnpm.

## Structure

```
src/
  app/           # layout.tsx, page.tsx, tree/page.tsx, node/[slug]/page.tsx, manifest/page.tsx
  components/
    ast/         # ASTCanvas, ASTNode, ASTEdge, ASTMobileTree, TraversalModeSelector
    landing/     # Cursor, ParseAnimation, RootPrompt
    chrome/      # TokenStream, ContextWindow, Header, CommandPalette
    nodes/       # ProjectNode, SkillNode, PhilosophyNode, TimelineNode
    shared/      # CodeBlock, GlowOrb, Tooltip
  data/          # AST structure + content (projects, skills, timeline, philosophy)
  content/       # MDX essays — DO NOT READ OR EDIT THESE AS CODE
  hooks/         # useTraversalState, useASTLayout, useParseAnimation, useMediaQuery
  lib/           # ast-types.ts, traversal utils, theme tokens, easter-eggs
  styles/        # globals.css
```

## AST Data Model

```typescript
type ASTNodeType =
  | 'RootNode' | 'ProgramNode' | 'BlockStatement' | 'FunctionDeclaration'
  | 'ObjectExpression' | 'ExpressionStatement' | 'CallExpression'
  | 'VariableDeclaration' | 'ArrayExpression' | 'ExportDeclaration'
  | 'StringLiteral' | 'ImportDeclaration' | 'TypeAnnotation';

interface ASTNode {
  id: string;        // kebab-case
  type: ASTNodeType;
  label: string;
  slug: string;
  glowColor: string; // e.g. "--ctp-peach"
  children?: ASTNode[];
  content?: { summary: string; body: string; deep?: string | null };
  meta?: { tags?: string[]; date?: string; links?: { label: string; url: string }[]; params?: string[] };
}
```

Use `satisfies ASTNode` for typed constants. Prefer discriminated unions + exhaustive switches.

## Traversal Modes

| Mode  | URL param      | Shows                          |
|-------|----------------|--------------------------------|
| Lex   | `?mode=lex`    | Labels + types only            |
| Parse | `?mode=parse`  | Labels + summaries + structure |
| Eval  | `?mode=eval`   | Full content, demos, essays    |

## Naming

| Thing         | Convention | Example                  |
|---------------|------------|--------------------------|
| Components    | PascalCase | `ASTCanvas.tsx`          |
| Hooks         | camelCase  | `useTraversalState.ts`   |
| Utils         | camelCase  | `traversal.ts`           |
| Content files | kebab-case | `code-as-consciousness.mdx` |
| CSS vars      | `--ctp-*`  | `--ctp-peach`            |
| Node IDs      | kebab-case | `"resumind"`             |

## Design Tokens (Catppuccin Mocha)

```
--ctp-base:#1e1e2e  --ctp-mantle:#181825  --ctp-crust:#11111b
--ctp-surface0:#313244  --ctp-surface1:#45475a
--ctp-text:#cdd6f4  --ctp-subtext0:#a6adc8
--ctp-peach:#fab387(projects)  --ctp-mauve:#cba6f7(skills)
--ctp-lavender:#b4befe(philosophy)  --ctp-teal:#94e2d5(timeline)
--ctp-green:#a6e3a1(connect)  --ctp-red:#f38ba8  --ctp-yellow:#f9e2af
```

Typography: JetBrains Mono (code/labels), EB Garamond (essays). Both self-hosted.

## State

Zustand (`useTraversalState.ts`): `visitedNodes`, `currentMode`, `contextWindow`, `expandedNodes` — persisted to sessionStorage. Mode also synced to URL params.

## Animations

Framer Motion: spring stiffness 120 / damping 20. Page transitions: fade + y-translate 200ms. CSS for ambient glow (3s pulse). Respect `prefers-reduced-motion` — disable glow + tree transitions.

## Performance Budget

- Initial JS < 200KB gzipped
- Lazy load: D3 canvas, MDX essays, node deep content
- Lighthouse: ≥95 perf, 100 a11y, 100 best practices, 100 SEO

## Key Invariants

1. `/`: terminal void, one cursor, one prompt. Nothing auto-unfolds.
2. Mobile list view (`ASTMobileTree`) is first-class.
3. Every node linkable at `/node/[slug]`.
4. Context Window persists across navigations.
5. Token stream clicks navigate to nodes.

## Error Handling

- `findNode` null → 404, never crash
- Zustand hydration → `skipHydration` + `onRehydrateStorage`
- D3 empty/single-node edge cases → guard in `useASTLayout`
- MDX load fail → fallback content, never blank page

## Accessibility

`role="tree"` / `role="treeitem"` on AST. Keyboard: Tab/Enter/Arrow. Focus rings: `--ctp-lavender`. SSR everything. WCAG AA contrast on all text.
