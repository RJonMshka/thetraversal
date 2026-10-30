import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Entity } from "@tv/ir";
import { ir } from "@/platform/ir";
import { loadNodeContent } from "@/lib/content";
import { KIND_TAG } from "@/lib/kind-label";
import { NodeShell } from "@/components/nodes/NodeShell";
import { ProjectNode } from "@/components/nodes/ProjectNode";
import { SkillNode } from "@/components/nodes/SkillNode";
import { PhilosophyNode } from "@/components/nodes/PhilosophyNode";
import { TimelineNode } from "@/components/nodes/TimelineNode";
import { IdentityNode } from "@/components/nodes/IdentityNode";
import { ConnectNode } from "@/components/nodes/ConnectNode";
import { GenericNode } from "@/components/nodes/GenericNode";
import { ResumeNode } from "@/components/nodes/ResumeNode";

// ── Static params for SSG ──────────────────────────────────────────────
export function generateStaticParams() {
  return Object.keys(ir.graph.entities).map((slug) => ({ slug }));
}

// ── Dynamic metadata per page ──────────────────────────────────────────
interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entity = ir.entity(slug);

  if (!entity) {
    return { title: "Node Not Found — The Traversal" };
  }

  const breadcrumb = ir.path(slug).map((p) => p.label).join(" > ");
  const description = entity.summary || `${KIND_TAG[entity.kind]}: ${entity.label}`;

  const title = `${entity.label} — The Traversal`;
  const url = `/node/${entity.id}`;

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
// One component per kind. `bodyHtml` is the entity's compiled IR body
// (canonical prose); without one, components render its excerpt.
function NodeContent({ entity, bodyHtml }: { entity: Entity; bodyHtml?: string }) {
  switch (entity.kind) {
    case "project":
      return <ProjectNode entity={entity} bodyHtml={bodyHtml} />;

    case "skill-cluster":
      return <SkillNode entity={entity} childEntities={ir.children(entity.id)} bodyHtml={bodyHtml} />;

    case "paper":
    case "essay":
      return <PhilosophyNode entity={entity} bodyHtml={bodyHtml} />;

    // The timeline shows the roles inside its ordered list.
    case "timeline":
    case "roles": {
      const list = entity.kind === "timeline" ? ir.children(entity.id)[0] : entity;
      const entries = list ? ir.children(list.id) : [];
      return <TimelineNode entity={entity} entries={entries} bodyHtml={bodyHtml} />;
    }

    case "identity":
      return <IdentityNode entity={entity} bodyHtml={bodyHtml} siblings={ir.children(ir.graph.rootId)} />;

    case "connect":
      return <ConnectNode entity={entity} childEntities={ir.children(entity.id)} bodyHtml={bodyHtml} />;

    case "resume":
      return <ResumeNode entity={entity} bodyHtml={bodyHtml} />;

    default:
      return <GenericNode entity={entity} bodyHtml={bodyHtml} />;
  }
}

// ── Page component ─────────────────────────────────────────────────────
export default async function NodePage({ params }: PageProps) {
  const { slug } = await params;
  const entity = ir.entity(slug);

  if (!entity) {
    notFound();
  }

  // Canonical prose from the IR body store; null falls back to the excerpt.
  const body = await loadNodeContent(entity.id);
  const path = ir.path(entity.id).map(({ id, label }) => ({ id, label }));

  return (
    <NodeShell entity={entity} path={path} childEntities={ir.children(entity.id)}>
      <NodeContent entity={entity} bodyHtml={body?.html} />
    </NodeShell>
  );
}
