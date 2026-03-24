import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PORTFOLIO_AST } from "@/data/ast";
import { findNode, flatten } from "@/lib/traversal";
import { NodeShell } from "@/components/nodes/NodeShell";
import { ProjectNode } from "@/components/nodes/ProjectNode";
import { SkillNode } from "@/components/nodes/SkillNode";
import { PhilosophyNode } from "@/components/nodes/PhilosophyNode";
import { TimelineNode } from "@/components/nodes/TimelineNode";
import { IdentityNode } from "@/components/nodes/IdentityNode";
import { ConnectNode } from "@/components/nodes/ConnectNode";
import { GenericNode } from "@/components/nodes/GenericNode";
import type { ASTNode } from "@/lib/ast-types";

// ── Static params for SSG ──────────────────────────────────────────────
export function generateStaticParams() {
  const allNodes = flatten(PORTFOLIO_AST);
  return allNodes.map((node) => ({ slug: node.slug }));
}

// ── Dynamic metadata per page ──────────────────────────────────────────
interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = findNode(PORTFOLIO_AST, slug);

  if (!result) {
    return { title: "Node Not Found — The Traversal" };
  }

  const { node, path } = result;
  const breadcrumb = path.map((p) => p.label).join(" > ");
  const description = node.content?.summary ?? `${node.type}: ${node.label}`;

  return {
    title: `${node.label} — The Traversal`,
    description,
    openGraph: {
      title: `${node.label} — The Traversal`,
      description,
      type: "article",
    },
    other: {
      "ast-path": breadcrumb,
    },
  };
}

// ── Node content renderer ──────────────────────────────────────────────
// Maps ASTNodeType to the appropriate component.
// Async because PhilosophyNode loads MDX content server-side.
async function NodeContent({ node }: { node: ASTNode }) {
  switch (node.type) {
    case "FunctionDeclaration":
      return <ProjectNode node={node} />;

    case "ObjectExpression":
      return <SkillNode node={node} />;

    case "CallExpression":
      return <PhilosophyNode node={node} />;

    case "VariableDeclaration":
    case "ArrayExpression":
      return <TimelineNode node={node} />;

    case "ProgramNode":
      return (
        <IdentityNode
          node={node}
          siblings={PORTFOLIO_AST.children ?? []}
        />
      );

    case "ExportDeclaration":
      return <ConnectNode node={node} />;

    // BlockStatement, StringLiteral, ExpressionStatement,
    // ImportDeclaration, TypeAnnotation, RootNode
    default:
      return <GenericNode node={node} />;
  }
}

// ── Page component ─────────────────────────────────────────────────────
export default async function NodePage({ params }: PageProps) {
  const { slug } = await params;
  const result = findNode(PORTFOLIO_AST, slug);

  if (!result) {
    notFound();
  }

  const { node, path } = result;

  return (
    <NodeShell node={node} path={path}>
      <NodeContent node={node} />
    </NodeShell>
  );
}
