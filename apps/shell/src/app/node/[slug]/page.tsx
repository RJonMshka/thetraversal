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
import type { ASTNode } from "@/targets/ast/lib/ast-types";

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

  const title = `${node.label} — The Traversal`;
  const url = `/node/${node.slug}`;

  // openGraph and twitter replace the root layout's objects rather than
  // merging, so set every field here. og:image comes from ./opengraph-image.
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "article",
      url,
      siteName: "The Traversal",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    other: {
      "ast-path": breadcrumb,
    },
  };
}

// ── Node content renderer ──────────────────────────────────────────────
// Maps ASTNodeType to the appropriate component. `bodyHtml` is the node's
// compiled IR body (canonical prose); without one, components render the
// node's excerpt (content.body). Dispatch moves to Entity.kind in Phase 3.
function NodeContent({ node, bodyHtml }: { node: ASTNode; bodyHtml?: string }) {
  switch (node.type) {
    case "FunctionDeclaration":
      return <ProjectNode node={node} bodyHtml={bodyHtml} />;

    case "ObjectExpression":
      return <SkillNode node={node} bodyHtml={bodyHtml} />;

    case "CallExpression":
      return <PhilosophyNode node={node} bodyHtml={bodyHtml} />;

    case "VariableDeclaration":
    case "ArrayExpression":
      return <TimelineNode node={node} bodyHtml={bodyHtml} />;

    case "ProgramNode":
      return (
        <IdentityNode
          node={node}
          bodyHtml={bodyHtml}
          siblings={getAST().children ?? []}
        />
      );

    case "ExportDeclaration":
      return <ConnectNode node={node} bodyHtml={bodyHtml} />;

    // Resume gets the PDF viewer; other imports (Education) are generic.
    case "ImportDeclaration":
      return node.slug === "resume" ? (
        <ResumeNode node={node} bodyHtml={bodyHtml} />
      ) : (
        <GenericNode node={node} bodyHtml={bodyHtml} />
      );

    // BlockStatement, StringLiteral, ExpressionStatement,
    // TypeAnnotation, RootNode
    default:
      return <GenericNode node={node} bodyHtml={bodyHtml} />;
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

  // Canonical prose from the IR body store; null falls back to the excerpt.
  const body = await loadNodeContent(node.slug);

  return (
    <NodeShell node={node} path={path}>
      <NodeContent node={node} bodyHtml={body?.html} />
    </NodeShell>
  );
}
