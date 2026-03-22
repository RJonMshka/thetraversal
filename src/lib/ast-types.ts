// AST Node Types — mirrors real AST terminology, mapped to portfolio concepts
export type ASTNodeType =
  | "RootNode" // The top-level entry point
  | "ProgramNode" // Identity / about section
  | "BlockStatement" // Grouping container
  | "FunctionDeclaration" // Projects (callable units of work)
  | "ObjectExpression" // Skill clusters (key-value structures)
  | "ExpressionStatement" // Philosophy wrapper
  | "CallExpression" // Philosophy essays (invocations of thought)
  | "VariableDeclaration" // Timeline container
  | "ArrayExpression" // Timeline entries (ordered collection)
  | "ExportDeclaration" // Connect / contact (public API)
  | "StringLiteral" // Individual leaf content
  | "ImportDeclaration" // Education / credentials
  | "TypeAnnotation"; // Metadata / type-level info

// Traversal depth modes — CLI flag metaphor
export type TraversalMode = "lex" | "parse" | "eval";

// Content at varying depths
export interface ASTNodeContent {
  summary: string; // Shown in --parse mode
  body: string; // Shown in --eval mode
  deep?: string | null; // Optional extended content (MDX slug, etc.)
}

// Metadata for links, tags, dates
export interface ASTNodeMeta {
  tags?: string[];
  date?: string;
  links?: { label: string; url: string }[];
  params?: string[]; // Function "parameters" (tech stack)
}

// The core AST node
export interface ASTNode {
  id: string; // kebab-case unique identifier
  type: ASTNodeType;
  label: string; // Human-readable display name
  slug: string; // URL-safe identifier for routing
  glowColor: string; // CSS custom property name (e.g. "--ctp-peach")
  children?: ASTNode[];
  content?: ASTNodeContent;
  meta?: ASTNodeMeta;
}

// Flattened node for search, filter, and token stream
export interface ASTNodeFlat {
  id: string;
  type: ASTNodeType;
  label: string;
  slug: string;
  glowColor: string;
  depth: number;
  parentId: string | null;
  content?: ASTNodeContent;
  meta?: ASTNodeMeta;
}

// Breadcrumb trail for navigation
export type ASTPath = {
  id: string;
  label: string;
  slug: string;
}[];

// Result of findNode — includes the node and path to it
export interface FindNodeResult {
  node: ASTNode;
  path: ASTPath;
}

// Context window entry — tracks a visitor's traversal
export interface ContextWindowEntry {
  slug: string;
  label: string;
  type: ASTNodeType;
  visitedAt: number; // timestamp
}

// Token in the career token stream
export interface TokenStreamEntry {
  type: "IDENT" | "OP" | "KEYWORD" | "LITERAL";
  value: string;
  slug?: string; // Links to a node if navigable
}
