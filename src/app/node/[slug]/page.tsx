import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAST, getFlatNodes, findNodeBySlug } from "@/data";
import { loadNodeContent } from "@/lib/content";
import { NodeShell } from "@/components/nodes/NodeShell";
import { ProjectNode } from "@/components/nodes/ProjectNode";
import { SkillNode } from "@/components/nodes/SkillNode";
import { PhilosophyNode } from "@/components/nodes/PhilosophyNode";
import { TimelineNode } from "@/components/nodes/TimelineNode";
import { IdentityNode } from "@/components/nodes/IdentityNode";
import { ConnectNode } from "@/components/nodes/ConnectNode";
import { GenericNode } from "@/components/nodes/GenericNode";
import { ResumeNode } from "@/components/nodes/ResumeNode";
import type { ASTNode } from "@/lib/ast-types";

// ── Content enrichment ─────────────────────────────────────────────────
// Merges MDX content into the node, preferring MDX over inline fallback.
// Data files hold short fallback strings; MDX holds the canonical prose.
async function enrichNodeContent(node: ASTNode): Promise<ASTNode> {
  const mdx = await loadNodeContent(node.slug);
  if (!mdx) return node;

  return {
    ...node,
    content: {
      summary: mdx.summary || node.content?.summary || "",
      body: mdx.body || node.content?.body || "",
      deep: mdx.deep ?? node.content?.deep ?? null,
    },
  };
}

// ── Static params for SSG ──────────────────────────────────────────────
export function generateStaticParams() {
  const allNodes = getFlatNodes();
  return allNodes.map((node) => ({ slug: node.slug }));
}

// ── Dynamic metadata per page ──────────────────────────────────────────
interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = findNodeBySlug(slug);

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
// Receives an MDX-enriched node — content already merged from MDX loader.
function NodeContent({ node }: { node: ASTNode }) {
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
          siblings={getAST().children ?? []}
        />
      );

    case "ExportDeclaration":
      return <ConnectNode node={node} />;

    case "ImportDeclaration":
      return <ResumeNode node={node} />;

    // BlockStatement, StringLiteral, ExpressionStatement,
    // TypeAnnotation, RootNode
    default:
      return <GenericNode node={node} />;
  }
}

// ── Page component ─────────────────────────────────────────────────────
export default async function NodePage({ params }: PageProps) {
  const { slug } = await params;
  const result = findNodeBySlug(slug);

  if (!result) {
    notFound();
  }

  const { node, path } = result;

  // Enrich node content from MDX (merges canonical prose over inline fallback)
  const enrichedNode = await enrichNodeContent(node);

  return (
    <NodeShell node={enrichedNode} path={path}>
      <NodeContent node={enrichedNode} />
    </NodeShell>
  );
}
