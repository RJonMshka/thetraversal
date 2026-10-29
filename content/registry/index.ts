import type { Registry } from "@tv/ir/compiler";
import { IDENTITY } from "./identity";
import { RESUME } from "./resume";
import { EDUCATION } from "./education";
import { PROJECTS, PROJECTS_SECTION } from "./projects";
import { RESEARCH } from "./research";
import { SKILLS } from "./skills";
import { TIMELINE } from "./timeline";
import { ESSAYS } from "./essays";
import { RELATIONS, STACK_ALIASES } from "./relations";

// ── Registry entry point (read by `pnpm --filter @tv/ir build`) ────────
// Order here is the order entities appear in graph.json. Tree order comes
// from each entity's `children`, not from this list.

export const REGISTRY: Registry = {
  rootId: "root",
  entities: [
    ...IDENTITY,
    ...RESUME,
    ...EDUCATION,
    PROJECTS_SECTION,
    ...PROJECTS,
    ...RESEARCH,
    ...SKILLS,
    ...TIMELINE,
    ...ESSAYS,
  ],
  relations: RELATIONS,
  stackAliases: STACK_ALIASES,
};
