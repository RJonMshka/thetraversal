# PLAN.md — The Traversal: Implementation Roadmap

## Overview

Nine-phase build plan for **The Traversal**, Rajat's AST-based portfolio website. Each phase is a self-contained milestone that produces a working, deployable state. Phases are ordered by dependency and impact — the most novel, differentiating features come first.

**Estimated total effort:** 40-55 hours across all phases.

---

## Phase 1: Foundation & The Void

**Goal:** Project scaffold + landing page experience (Brahman layer).

**Duration:** 4-5 hours

### Tasks

1. **Project init**
   - `pnpm create next-app@latest the-traversal --typescript --tailwind --app --src-dir`
   - Configure `tsconfig.json` with strict mode and `@/` path alias
   - Install core dependencies: `framer-motion`, `zustand`, `clsx`, `tailwind-merge`
   - Set up `globals.css` with Catppuccin Mocha CSS custom properties
   - Self-host JetBrains Mono and EB Garamond via `next/font/local`

2. **Tailwind config**
   - Extend theme with Catppuccin color tokens (mapping `--ctp-*` variables)
   - Define font families: `mono` → JetBrains Mono, `serif` → EB Garamond
   - Add custom animation keyframes: `glow-pulse`, `cursor-blink`, `parse-in`

3. **Root layout (`app/layout.tsx`)**
   - Dark background (`--ctp-base`), font loading, metadata (title, OG tags)
   - Minimal: no navigation chrome yet — the landing page is the void

4. **Landing page (`app/page.tsx`)**
   - Full-viewport dark screen with a single blinking cursor (CSS animation)
   - `Cursor` component: accepts keyboard input, responds to specific commands
   - Type anything or press Enter → triggers `ParseAnimation` component
   - `ParseAnimation`: text entered by visitor gets "lexed" (characters split with color), "parsed" (rearranged into structure), "evaluated" (morphs into a welcome message + CTA)
   - After animation completes → `router.push('/tree')` or a "Begin Traversal" link appears
   - The whole sequence should feel like booting a consciousness

5. **Easter egg: `console.log(rajat)`**
   - If the visitor types `console.log(rajat)` at the cursor → render a formatted JSON blob of personality traits, interests, and a joke
   - Handle a few other fun commands: `help`, `ls`, `cat README`, `sudo hire rajat`

### Deliverable
A deployed landing page that feels like no other portfolio on the internet. Visitors encounter a void, interact with a cursor, and witness their input being compiled.

### Exit Criteria
- Landing page renders in < 1s on 3G
- ParseAnimation runs smoothly at 60fps
- Works without JS (shows static fallback with a direct link to `/tree`)
- At least 3 easter egg commands work

---

## Phase 2: The AST Data Layer

**Goal:** Define the complete AST data structure and TypeScript types. No UI yet — pure data modeling.

**Duration:** 3-4 hours

### Tasks

1. **Type definitions (`lib/ast-types.ts`)**
   - Define `ASTNodeType` discriminated union (all 13 node types from CLAUDE.md)
   - Define `ASTNode` interface with `id`, `type`, `label`, `slug`, `glowColor`, `children`, `content`, `meta`
   - Define `TraversalMode` type: `'lex' | 'parse' | 'eval'`
   - Define `ContextWindowEntry` type for tracking visited nodes
   - Utility types: `ASTNodeFlat` (for search/filter), `ASTPath` (breadcrumb trail)

2. **Master AST (`data/ast.ts`)**
   - Build the complete tree as a single typed constant: `PORTFOLIO_AST: ASTNode`
   - Root node with 5 top-level children: Identity, Projects, Skills, Philosophy, Connect
   - Each project as a `FunctionDeclaration` with `params` (tech stack) and `content` at all 3 depth levels
   - Skills as `ObjectExpression` nodes with children for individual skill items
   - Timeline as `VariableDeclaration` → `ArrayExpression` with chronological entries
   - Philosophy as `ExpressionStatement` → `CallExpression` nodes pointing to MDX files

3. **Content files**
   - `data/projects.ts`: RESUMIND, Clause, AI Commit Generator, CRM Tool — each with summary, body, tags, links
   - `data/skills.ts`: Languages, Frameworks, Systems, Tools — with proficiency scores (0-100)
   - `data/timeline.ts`: UIC → Discover → Capital One → Side projects — with dates and stories
   - `data/philosophy.ts`: metadata for the 3 essays (actual MDX comes in Phase 7)

4. **Traversal utilities (`lib/traversal.ts`)**
   - `findNode(tree, slug)`: DFS search returning node + path
   - `getChildren(tree, slug)`: immediate children of a node
   - `flatten(tree)`: produce a flat array for search/filter
   - `getTokenStream(tree)`: produce the linear career token sequence
   - `filterByMode(node, mode)`: strip content fields based on traversal mode

5. **Zustand store (`hooks/useTraversalState.ts`)**
   - State: `visitedNodes: Set<string>`, `currentMode: TraversalMode`, `contextWindow: ContextWindowEntry[]`, `expandedNodes: Set<string>`
   - Actions: `visitNode(slug)`, `setMode(mode)`, `toggleExpand(slug)`, `resetTraversal()`
   - Persist `visitedNodes` and `contextWindow` to sessionStorage

### Deliverable
A fully typed, traversable AST data structure. All content authored. Utility functions tested.

### Exit Criteria
- `PORTFOLIO_AST` type-checks with zero errors
- Every node has content for all 3 modes (lex, parse, eval)
- `findNode` correctly locates any node by slug
- `flatten` produces the expected number of nodes
- Zustand store initializes and persists correctly

---

## Phase 3: The AST Visualizer (Desktop)

**Goal:** Build the interactive D3-powered tree visualization — the centerpiece of the site.

**Duration:** 8-10 hours

### Tasks

1. **Install D3 (`d3-hierarchy`, `d3-shape`, `d3-zoom`, `d3-transition`)**
   - Import only the modules needed — no full D3 bundle

2. **`useASTLayout` hook**
   - Takes the `PORTFOLIO_AST` and current `expandedNodes` from Zustand
   - Uses `d3.tree()` to compute x/y positions for each visible node
   - Returns: `{ nodes: LayoutNode[], edges: Edge[], dimensions: { width, height } }`
   - Recalculates when nodes expand/collapse (animated rebalancing)
   - Handles the layout math for different tree depths (collapsed = compact, expanded = spacious)

3. **`ASTCanvas` component**
   - Renders an `<svg>` element that fills the available space
   - Implements zoom + pan via `d3-zoom` (bound to React refs, not direct DOM manipulation)
   - Renders `ASTEdge` components for connections and `ASTNode` components for nodes
   - Initial view: zoom-to-fit showing the root + top-level children
   - Smooth animated transitions when the tree structure changes (spring physics via Framer Motion on SVG `transform`)

4. **`ASTNode` component (SVG)**
   - Rounded rect with glow effect (SVG filter: drop-shadow using node's `glowColor`)
   - Shows: node type label (small, monospace, dimmed) + node label (larger, readable)
   - Visual state: default / hovered / expanded / visited
   - Visited nodes get a subtle checkmark or filled dot indicator
   - Click → dispatches `toggleExpand` and `visitNode` to Zustand store
   - Hover → shows tooltip with summary (in --parse and --eval modes)
   - Pulse animation on unvisited nodes (CSS `glow-pulse` keyframe)

5. **`ASTEdge` component (SVG)**
   - Curved bezier paths connecting parent → child nodes
   - Color: `--ctp-surface1` default, `--ctp-lavender` when the path leads to the currently focused node
   - Animate path drawing on first render (SVG `stroke-dasharray` + `stroke-dashoffset` trick)

6. **`TraversalModeSelector` component**
   - Three buttons: `--lex`, `--parse`, `--eval`
   - Styled as CLI flags: monospace, with a `$` prompt prefix
   - Active mode highlighted with the node glow color
   - Changing mode updates URL search param and triggers tree re-render with appropriate content depth
   - Positioned fixed at top of the tree page

7. **Tree page (`app/tree/page.tsx`)**
   - Layout: AST canvas takes ~70% width, context window sidebar takes ~30%
   - Reads `?mode=` from URL search params, falls back to `parse`
   - Token stream bar at the bottom (implemented in Phase 5)

### Deliverable
A fully interactive, zoomable, animated AST tree on desktop. Visitors can expand/collapse nodes, switch traversal modes, and see the tree rebalance in real-time.

### Exit Criteria
- Tree renders all nodes from `PORTFOLIO_AST` correctly
- Expand/collapse animates smoothly (no jank, 60fps)
- Zoom + pan works intuitively (scroll to zoom, drag to pan)
- Mode switching changes visible content depth
- All nodes clickable and keyboard-navigable (Tab + Enter)
- SVG renders without overflow or clipping issues

---

## Phase 4: Node Deep Dive Pages

**Goal:** Individual pages for each AST node — the `/node/[slug]` route.

**Duration:** 5-6 hours

### Tasks

1. **Dynamic route (`app/node/[slug]/page.tsx`)**
   - Uses `findNode(PORTFOLIO_AST, slug)` to locate the node
   - Renders different layouts based on `node.type`:
     - `FunctionDeclaration` → `ProjectNode` (project detail page)
     - `ObjectExpression` → `SkillNode` (skill cluster visualization)
     - `CallExpression` → `PhilosophyNode` (essay reader)
     - `ArrayExpression` → `TimelineNode` (horizontal timeline)
     - `ProgramNode` → `IdentityNode` (bio/intro)
     - `ExportDeclaration` → `ConnectNode` (links/contact)
   - Breadcrumb trail showing AST path: `Root > Projects > RESUMIND`
   - "Back to Tree" link that navigates to `/tree` and auto-focuses this node
   - `generateStaticParams` for SSG of all node pages
   - `generateMetadata` for per-page OG tags

2. **`ProjectNode` component**
   - Header: function signature style → `function RESUMIND(nextjs, typescript, claude_api) {`
   - Body: description, architecture diagram (can be a simple SVG/image), key decisions
   - Footer: `return { impact: "...", links: [...] }`
   - Tech stack tags rendered as function params
   - Link to GitHub repo and/or live demo if available

3. **`SkillNode` component**
   - Renders a cluster of skill items with proficiency heat visualization
   - Each skill: name + horizontal bar filled to proficiency % + years of experience
   - Bar colors use the node's `glowColor`
   - Group header styled as: `const languages: ObjectExpression = {`

4. **`PhilosophyNode` component**
   - Full essay layout: serif font (EB Garamond), generous line height (1.8), max-width 65ch
   - MDX rendering with custom components for code blocks, quotes, emphasis
   - Reading time estimate at the top
   - Styled as a `CallExpression`: `consciousness("advaita", "computation")`

5. **`TimelineNode` component**
   - Horizontal scrollable timeline (desktop) or vertical list (mobile)
   - Each entry: date, title, description, expandable detail
   - Entries connected by a line/path
   - Current position highlighted with a pulsing indicator
   - Styled as array elements: `[0]: "UIC — MS Computer Science"`, `[1]: "Discover Financial"`, etc.

6. **`IdentityNode` component**
   - Photo (optional) + name + tagline
   - The "root node" intro — 2 paragraphs max
   - Import/export syntax decoration: `import { Rajat } from "chicago"`
   - Links to all top-level AST branches

7. **`ConnectNode` component**
   - GitHub, LinkedIn, Email — each as a named export
   - `export { github, linkedin, email } from "rajat"`
   - "Fork this tree" CTA linking to the portfolio's source repo
   - Simple, clean, no fluff

### Deliverable
Every node in the AST has a dedicated, beautifully rendered detail page with SSR support.

### Exit Criteria
- All node pages render correctly with SSG
- Each node type has a distinct, AST-themed layout
- Breadcrumb navigation works correctly
- Pages are accessible (headings, landmarks, focus management)
- OG tags generate correct previews for each page

---

## Phase 5: Token Stream & Context Window

**Goal:** The two persistent chrome elements that give the portfolio its "runtime" feeling.

**Duration:** 4-5 hours

### Tasks

1. **`TokenStream` component**
   - Horizontal scrolling bar fixed to the bottom of the viewport
   - Renders career milestones as tokens: `[IDENT: "UIC"]  [OP: "→"]  [IDENT: "Discover"]  [OP: "→"]  ...`
   - Each token is clickable → navigates to the corresponding node
   - Current "position" (based on which node the visitor is viewing) highlighted
   - Smooth scroll-to-active behavior
   - Styled: dark bar (`--ctp-mantle`), tokens in monospace, type labels dimmed, values bright
   - Auto-hide on scroll down, reveal on scroll up (or hover near bottom)

2. **`ContextWindow` component**
   - Sidebar (desktop) or bottom sheet (mobile)
   - Lists all visited nodes in traversal order
   - Each entry: node type icon + label + timestamp of visit
   - Running stats: "X of Y nodes visited", "Traversal depth: N levels"
   - At the bottom (once ≥8 nodes visited): generate a summary sentence
     - Pattern: "You've explored Rajat as: [list of discovered aspects]"
   - "Clear traversal" button to reset
   - "Share your traversal" — generates a URL with visited node slugs encoded as query params

3. **Integration into tree page layout**
   - Desktop: tree page = ASTCanvas (left ~70%) + ContextWindow (right ~30%) + TokenStream (bottom)
   - Tablet: ASTCanvas (full width) + ContextWindow (slide-over overlay) + TokenStream (bottom)
   - Mobile: ASTMobileTree (full width) + ContextWindow (bottom sheet, swipe up) + TokenStream (swipeable)

4. **Traversal summary generation**
   - Based on visited node types, generate a natural-language summary
   - Map: visited FunctionDeclarations → "a builder of [project names]"
   - Map: visited ObjectExpressions → "fluent in [skill areas]"
   - Map: visited CallExpressions → "a thinker who contemplates [essay topics]"
   - This is static logic, not AI-generated (keep it fast and predictable)

### Deliverable
The portfolio now has runtime chrome — visitors can see their journey as a token stream and their accumulated knowledge as a context window.

### Exit Criteria
- Token stream scrolls to active token on navigation
- Context window updates in real-time as nodes are visited
- Summary generates correctly based on visited node distribution
- Bottom sheet interaction works smoothly on mobile (no scroll conflicts)
- Share URL correctly encodes and decodes traversal state

---

## Phase 6: Mobile AST (The List Tree)

**Goal:** First-class mobile experience using a collapsible nested list that preserves the AST metaphor.

**Duration:** 3-4 hours

### Tasks

1. **`ASTMobileTree` component**
   - Recursive collapsible list rendering the same `PORTFOLIO_AST` data
   - Each node: indented row with expand/collapse chevron + type badge + label
   - Type badge: small pill showing `FN` for FunctionDeclaration, `OBJ` for ObjectExpression, etc.
   - Color-coded left border using node's `glowColor`
   - Tap to expand children, tap the label/content area to navigate to `/node/[slug]`
   - Smooth expand/collapse animation via Framer Motion `AnimatePresence` + `motion.div` with height animation

2. **Content preview inline**
   - In `--parse` mode: show summary text below the label when expanded
   - In `--eval` mode: show full content inline (or a "Read more →" link to the node page)
   - In `--lex` mode: labels only, most compact view

3. **Responsive switching**
   - `useMediaQuery` hook detects breakpoint
   - `/tree` page conditionally renders `ASTCanvas` (desktop) or `ASTMobileTree` (mobile)
   - Same Zustand state drives both — no data duplication

4. **Mobile-specific interactions**
   - Swipe right on a node → quick-visit (marks as visited without navigating)
   - Long-press on a node → shows tooltip with summary
   - Pull-to-refresh → resets expanded state

### Deliverable
The mobile experience is a fully functional, touch-optimized AST explorer — not a degraded fallback.

### Exit Criteria
- List renders correctly on iPhone SE (smallest target) through iPad
- Expand/collapse animation is smooth (no layout shift)
- All nodes reachable via touch interaction
- Token stream and context window don't conflict with list scrolling
- Lighthouse mobile performance score ≥ 90

---

## Phase 7: Philosophy Content (MDX Essays)

**Goal:** Write and render the three philosophical essays that differentiate this portfolio.

**Duration:** 5-6 hours (mostly writing)

### Tasks

1. **MDX setup**
   - Install `@next/mdx` or `next-mdx-remote`
   - Configure MDX with custom components: `CodeBlock`, `Blockquote`, `Emphasis`, `InlineCode`
   - Ensure Shiki syntax highlighting works in MDX code blocks with Catppuccin theme

2. **Essay 1: "Code as Consciousness"**
   - Theme: the parallels between Advaita Vedanta's model of consciousness and how programs execute
   - Brahman as the runtime, Maya as the program, Atman as the observer/debugger
   - Personal angle: how this framework shapes how Rajat approaches software architecture
   - Length: 800-1200 words
   - Include 2-3 code snippets that serve as metaphors

3. **Essay 2: "Why I Build Languages"**
   - Theme: the compiler as the ultimate tool for understanding — if you can compile it, you understand it
   - Connect: Thorsten Ball's book → Scala DSL at UIC → Clause language → the portfolio itself
   - Personal angle: the intellectual journey from "I should learn compilers" to "I see everything as compilation"
   - Length: 600-900 words

4. **Essay 3: "On AI Consciousness"**
   - Theme: a genuine, non-performative inquiry into whether AI systems have experience
   - Not a hot take — a thoughtful exploration informed by Vedantic philosophy and daily AI use
   - Personal angle: "I work with Claude every day. Here's what I actually think."
   - Length: 600-900 words

5. **Essay rendering in `PhilosophyNode`**
   - Serif typography, generous margins, dark background with slightly elevated surface
   - Reading progress bar at the top (CSS-only, scroll-linked)
   - Footnotes or margin notes for tangential thoughts

### Deliverable
Three polished essays that no other developer portfolio has — philosophical depth paired with technical grounding.

### Exit Criteria
- All three essays render beautifully with proper typography
- Code blocks within essays use Shiki + Catppuccin
- Reading experience feels like a quality blog, not a portfolio afterthought
- Essays are SSR'd for SEO and shareability

---

## Phase 8: Polish, Performance & Easter Eggs

**Goal:** Elevate from "working" to "memorable." Performance hardening + delightful details.

**Duration:** 4-5 hours

### Tasks

1. **Parse animation refinement**
   - Landing page cursor → the lex/parse/eval animation should feel magical
   - Characters appear as colored tokens (keywords in mauve, identifiers in peach, operators in teal)
   - Tokens rearrange into tree structure (brief AST formation visual)
   - Tree "evaluates" into the welcome message
   - Total duration: 2-3 seconds, skippable via click/Enter

2. **Easter eggs**
   - Konami code (↑↑↓↓←→←→BA) → site re-renders all text content in Clause syntax for 10 seconds
   - Idle 30 seconds on any page → subtle message fades in at bottom: "The observer is still. The tree awaits."
   - Click the root node 5 times → brief "stack overflow" animation (nodes cascade/tumble, then recover)
   - View source reveals a formatted ASCII art comment

3. **Performance optimization**
   - Audit with Lighthouse — target ≥ 95 performance, 100 accessibility
   - Lazy load D3 canvas (dynamic import, show skeleton while loading)
   - Lazy load MDX essays (only load when navigating to philosophy nodes)
   - Preload adjacent nodes on hover (Next.js `<Link prefetch>`)
   - Optimize SVG: minimize filter complexity, use CSS transforms over SVG transforms
   - Image optimization: use `next/image` for any photos, convert to WebP
   - Font subsetting: only include Latin characters for JetBrains Mono and EB Garamond

4. **SEO & metadata**
   - Per-page `<title>` and `<meta description>` reflecting AST node content
   - OG image: auto-generated or static, showing the AST tree visualization
   - JSON-LD structured data: Person schema with sameAs links
   - Sitemap generation via `next-sitemap`
   - `robots.txt` allowing full crawling

5. **Accessibility audit**
   - ARIA tree role on AST canvas
   - Keyboard navigation: arrow keys traverse the tree, Enter expands/navigates
   - Focus management on route changes
   - Reduced motion: respect `prefers-reduced-motion` — disable glow pulses, parse animation, tree transitions
   - Screen reader: all nodes announce type + label + state (expanded/collapsed/visited)
   - Color contrast: verify all text on `--ctp-base` meets WCAG AA

### Deliverable
A portfolio that is fast, accessible, and full of delightful surprises for those who look closely.

### Exit Criteria
- Lighthouse: ≥ 95 performance, 100 accessibility, 100 best practices, 100 SEO
- All easter eggs work without breaking normal navigation
- `prefers-reduced-motion` disables all non-essential animation
- Full keyboard navigation through entire site
- Initial JS bundle < 200KB (gzipped)

---

## Phase 9: Deploy & Launch

**Goal:** Ship it. Make it real.

**Duration:** 2-3 hours

### Tasks

1. **Domain setup**
   - Register domain (e.g., `rajat.dev`, `thetraversal.dev`, or preferred domain)
   - Configure DNS for Vercel

2. **Vercel deployment**
   - Connect GitHub repo
   - Configure build settings (pnpm, Next.js auto-detected)
   - Set environment variables (if any, e.g., analytics keys)
   - Enable Vercel Analytics (Web Vitals monitoring)

3. **Open source the portfolio**
   - Clean up the repo: remove any sensitive content, ensure all content is authored
   - Add a LICENSE (MIT or similar)
   - Write a compelling README.md for the repo itself (meta: the README is about the AST)
   - The "Fork this tree" CTA on the Connect page links to the repo

4. **Analytics**
   - Vercel Analytics for Web Vitals
   - Optional: Plausible or Umami for privacy-friendly page analytics
   - Track: which nodes are most visited, average traversal depth, popular traversal paths

5. **Social launch**
   - Prepare a tweet/LinkedIn post with a screen recording of the landing animation
   - Post on Hacker News (Show HN)
   - Share in relevant Discord/Slack communities

6. **Post-launch monitoring**
   - Watch for console errors via Vercel logs
   - Monitor Core Web Vitals for first week
   - Iterate based on real visitor traversal patterns

### Deliverable
The portfolio is live, indexed, and being discovered.

### Exit Criteria
- Site loads on custom domain with valid SSL
- All pages render correctly in production
- No console errors in production build
- OG previews render correctly when shared on social platforms
- GitHub repo is public with a polished README

---

## Phase 10: Resume Integration & Desktop Node Navigation

**Goal:** Add a resume as a first-class AST node with PDF/DOCX view and download, a landing page `resume` command, and solve the desktop tree's missing node-page navigation.

**Duration:** 6-8 hours

**Dependencies:** Phases 2, 3, 4, 8

### Problem Analysis

Two distinct problems to solve:

1. **Resume feature.** The portfolio has no resume. A portfolio without a resume is incomplete — recruiters and hiring managers expect a downloadable document. But simply linking a PDF undermines the AST metaphor. The resume must be *part of the tree*, viewable inline and downloadable in standard formats.

2. **Desktop tree navigation gap.** Currently, clicking a node on the desktop SVG canvas toggles expand/collapse — there is no way to navigate to the node's detail page (`/node/[slug]`). The mobile tree already solves this by rendering the label as a `<Link>`. The desktop tree needs a parallel mechanism that doesn't conflict with expand/collapse.

### Architecture Decisions

#### Resume in the AST

The resume belongs under the existing **Identity** node (`ProgramNode`), not as a new top-level branch. Reasoning:

- The Identity node already represents "who Rajat is" — a resume is a formal projection of identity
- Adding a 7th top-level branch would crowd the tree and break the current visual balance
- The resume is a document *about* Rajat, not a category *of* Rajat's work
- AST type: `ImportDeclaration` — this type is defined in `ASTNodeType` but currently unused. Semantically, importing a resume into the tree feels right: `import resume from "./rajat-kumar.pdf"` — the resume is an external artifact being brought into the AST

Tree structure change:
```
ProgramNode: "Identity" (slug: "identity")
├── ImportDeclaration: "Resume" (slug: "resume")    ← NEW
```

The Identity node becomes a parent (gains `children`) instead of a leaf. This has implications for the tree layout — `useASTLayout` will pick it up automatically since it respects `children` arrays.

#### Resume file formats

Two files in `public/resume/`:
- `rajat-kumar-resume.pdf` — the canonical format for viewing and downloading
- `rajat-kumar-resume.docx` — for ATS systems and recruiters who request Word format

These are static files, not generated. When the resume content changes, both files are manually updated and committed. No server-side PDF generation needed — that adds complexity and fragility for no user benefit.

#### ResumeNode component

A new component in `src/components/nodes/ResumeNode.tsx` that renders:

1. **Inline PDF viewer** — an `<iframe>` or `<object>` embedding the PDF with a themed wrapper. Falls back to a download link on browsers/devices that don't support inline PDF viewing (most mobile browsers).
2. **Download bar** — two buttons: "Download PDF" and "Download DOCX", styled as export statements: `export { resume } from "pdf" | "docx"`
3. **AST decoration** — `import resume from "./rajat-kumar.pdf"` header matching the `ImportDeclaration` type

The viewer should be lazy-loaded. The PDF is not part of the JS bundle — it's fetched only when the resume node page is visited.

#### Landing page `resume` command

Add `resume` (and aliases `cat resume`, `open resume`) to the easter egg commands in `src/lib/easter-eggs.ts`. Instead of printing text output, this command should trigger a **direct download** of the PDF.

This requires a new `EasterEggResult` type: `"action"`. When the result type is `"action"`, the `Cursor` component executes a side effect (like initiating a download or navigating to a URL) instead of rendering output text.

```typescript
type EasterEggResult = {
  type: "json" | "text" | "lines" | "action";
  content: string | string[];
  action?: { kind: "download"; url: string } | { kind: "navigate"; url: string };
};
```

The `resume` command outputs a few lines of feedback ("Downloading resume...") AND triggers the download action. The `cat resume` alias shows the resume content inline as text (a condensed plain-text version), while `open resume` navigates to `/node/resume`.

#### Desktop tree node navigation

The desktop SVG tree currently only supports click-to-expand. The mobile tree solves navigation by making the label a `<Link>` — but SVG doesn't support `<Link>` from Next.js.

**Solution: double-click to navigate.**

- **Single click** → expand/collapse (current behavior, unchanged)
- **Double-click** → navigate to `/node/[slug]` detail page

Why double-click and not a separate button:

1. **Adding a visible button inside the SVG node** crowds the already-compact node layout, especially at zoom levels < 1x. The node header is 56px tall with a type badge, label, visited dot, and expand chevron already.
2. **A tooltip with a link on hover** adds hover delay and an extra click — worse UX than double-click.
3. **Double-click is discoverable** via the cursor change (`pointer` is already set) and can be hinted in the mode selector or a first-visit tooltip. It's a standard pattern for "open" in tree UIs (file explorers, IDE project trees).
4. **Leaf nodes** (nodes without children, like individual skills or timeline entries) should navigate on single click since they have nothing to expand. This makes single-click = expand for parents, single-click = navigate for leaves — matching file explorer conventions exactly.

Implementation:

- In `ASTCanvas.tsx`, the `handleNodeClick` callback gets a double-click variant via a new `handleNodeDoubleClick` that calls `router.push(`/node/${slug}`)`.
- In `ASTNode.tsx`, add an `onDoubleClick` prop and handler. For leaf nodes, the single `onClick` calls `onNodeNavigate` instead of `onNodeClick`.
- The cursor changes to indicate the interaction: `cursor: pointer` for all nodes (already set), with a brief visual hint (the node border brightens or a small arrow icon appears) on hover to signal navigability.
- Keyboard: Enter on a focused node with children = expand/collapse (unchanged). Ctrl+Enter or a dedicated key (e.g., `o` for "open") = navigate to node page. For leaf nodes, Enter = navigate.
- ARIA: add `aria-description="Double-click to open detail page"` to parent nodes and update the label for leaf nodes.

### Tasks

1. **Resume files**
   - Create `public/resume/` directory
   - Add `rajat-kumar-resume.pdf` and `rajat-kumar-resume.docx` (placeholder or real files)
   - Add `/resume/` to the `ls` command output in `src/lib/easter-eggs.ts`

2. **AST data update**
   - Create `src/data/resume.ts` — define the resume `ASTNode` with `ImportDeclaration` type, slug `"resume"`, glowColor `"--ctp-yellow"` (inherits from Identity)
   - Content: summary = "Rajat Kumar — Software Engineer. View or download in PDF/DOCX.", body = a plain-text condensed version of the resume
   - Meta: `links` to both PDF and DOCX download URLs
   - Update `src/data/ast.ts` — make the Identity node's `children` array include the resume node
   - Update Identity node content to reflect it now has a child

3. **ResumeNode component (`src/components/nodes/ResumeNode.tsx`)**
   - `import resume from "./rajat-kumar.pdf"` header decoration
   - Inline PDF viewer: `<object>` tag with `type="application/pdf"` pointing to `/resume/rajat-kumar-resume.pdf`, with a sensible height (70vh) and themed border
   - Fallback for unsupported browsers/mobile: "Your browser doesn't support inline PDF viewing" + prominent download link
   - Download bar: two `<a download>` buttons styled as named exports
   - Mobile-first: on small screens, skip the viewer entirely and show download buttons prominently with a preview thumbnail (first page of PDF rendered as an image, or just descriptive text)
   - Wire into `NodeContent` switch in `src/app/node/[slug]/page.tsx`

4. **Landing page resume commands**
   - Extend `EasterEggResult` type with `"action"` variant in `src/lib/easter-eggs.ts`
   - Add `resume` command: outputs "Downloading resume..." + triggers PDF download via `action: { kind: "download", url: "/resume/rajat-kumar-resume.pdf" }`
   - Add `cat resume` alias: outputs a plain-text condensed resume (name, title, key skills, experience highlights — ~15 lines)
   - Add `open resume` alias: navigates to `/node/resume` via `action: { kind: "navigate", url: "/node/resume" }`
   - Update `help` command output to include `resume` in the available commands list
   - Update `Cursor.tsx` to handle `"action"` result type — execute downloads via programmatic `<a>` click, navigation via `router.push()`

5. **Desktop tree node navigation**
   - **`ASTNode.tsx`:**
     - Add `onNodeNavigate` prop: `(slug: string) => void`
     - Add `onDoubleClick` handler that calls `onNodeNavigate`
     - For leaf nodes (no children): single click calls `onNodeNavigate` instead of `onNodeClick`
     - Update keyboard handler: Ctrl+Enter or `o` key = navigate. Enter on leaf = navigate.
     - Add a subtle navigation affordance on hover: small arrow icon (→) appears in the header, or the border style changes to signal "you can open this"
     - Update ARIA attributes to communicate the double-click / navigation behavior
   - **`ASTCanvas.tsx`:**
     - Add `handleNodeNavigate` callback that calls `router.push(`/node/${slug}`)`
     - Pass it as `onNodeNavigate` to each `ASTNode`
     - Import `useRouter` from `next/navigation`
     - For leaf nodes: `handleNodeClick` should call `visitNode` (mark visited) but NOT `toggleExpand` (nothing to expand), then navigate

6. **Update `ls` command and help text**
   - `ls` output: add `"-rw-r--r--  resume.pdf"` and `"-rw-r--r--  resume.docx"`
   - `help` output: add `"  resume                   — download the resume"`
   - Update `cat README` to mention the resume

7. **Tests**
   - Unit test for `findNode(PORTFOLIO_AST, "resume")` returning the correct node
   - Test that `flatten(PORTFOLIO_AST)` count increases by 1 (resume node added)
   - Test resume command in easter eggs returns correct result type
   - Test that Identity node now has children
   - Verify `generateStaticParams` includes `"resume"` slug

8. **Accessibility**
   - Resume viewer: `<object>` has `aria-label="Resume PDF viewer"` and a text alternative
   - Download buttons: clear accessible names ("Download resume as PDF", "Download resume as DOCX")
   - Desktop tree navigation: announce the interaction model to screen readers
   - Keyboard: ensure double-click equivalent is available (Ctrl+Enter)

### Deliverable

The resume is a first-class citizen of the AST — discoverable via the tree, accessible from the terminal, viewable inline, and downloadable in two formats. Desktop tree nodes are navigable to their detail pages via double-click (parents) or single click (leaves), closing the UX gap with mobile.

### Exit Criteria

- `/node/resume` renders the inline PDF viewer with download buttons
- `resume` command at the landing cursor triggers a PDF download
- `cat resume` prints a condensed text resume
- `open resume` navigates to the resume node page
- PDF and DOCX download buttons work correctly (correct MIME type, filename)
- Double-clicking any node on the desktop tree navigates to its detail page
- Single-clicking a leaf node navigates to its detail page
- Single-clicking a parent node still expands/collapses (no regression)
- Keyboard navigation: Ctrl+Enter opens node detail page from the tree
- Identity node shows the resume as a child in both desktop and mobile tree views
- All existing tests pass + new tests for resume node and navigation
- `pnpm build` passes with zero errors
- Mobile: resume page shows download buttons prominently (no broken inline viewer)

---

## Phase Dependency Graph

```
Phase 1 (Foundation + Landing)
    └──→ Phase 2 (AST Data Layer)
              ├──→ Phase 3 (AST Visualizer Desktop)
              │         └──→ Phase 5 (Token Stream + Context Window)
              │                   └──→ Phase 8 (Polish + Performance)
              │                              ├──→ Phase 9 (Deploy)
              │                              └──→ Phase 10 (Resume + Node Navigation)
              ├──→ Phase 4 (Node Detail Pages)
              │         └──→ Phase 7 (Philosophy MDX Essays)
              └──→ Phase 6 (Mobile AST)
```

Phases 3, 4, and 6 can be worked in parallel after Phase 2 completes. Phase 7 (writing) can happen alongside any coding phase. Phase 8 is the integration/polish pass. Phase 9 is launch. Phase 10 depends on Phases 2 (data layer), 3 (tree visualizer), 4 (node pages), and 8 (polish) being complete.

---

## Quick Reference: What Goes Where

| Content Type | File Location | Format |
|---|---|---|
| AST structure | `src/data/ast.ts` | TypeScript const |
| Project details | `src/data/projects.ts` | TypeScript objects |
| Skill data | `src/data/skills.ts` | TypeScript objects |
| Timeline entries | `src/data/timeline.ts` | TypeScript objects |
| Resume data | `src/data/resume.ts` | TypeScript objects |
| Resume files | `public/resume/` | PDF, DOCX |
| Philosophy essays | `src/content/*.mdx` | MDX |
| Component styles | Inline Tailwind classes | Utility-first |
| Theme tokens | `src/styles/globals.css` | CSS custom properties |
| Global state | `src/hooks/useTraversalState.ts` | Zustand store |
| Tree layout math | `src/hooks/useASTLayout.ts` | D3 hierarchy |