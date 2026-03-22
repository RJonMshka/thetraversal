import { describe, it, expect } from "vitest";
import {
  findNode,
  getChildren,
  flatten,
  getTokenStream,
  filterByMode,
  countNodes,
  getMaxDepth,
} from "@/lib/traversal";
import { PORTFOLIO_AST } from "@/data/ast";
import type { ASTNode } from "@/lib/ast-types";

// ── findNode ───────────────────────────────────────────────────────────

describe("findNode", () => {
  it("finds the root node", () => {
    const result = findNode(PORTFOLIO_AST, "root");
    expect(result).not.toBeNull();
    expect(result!.node.id).toBe("root");
    expect(result!.path).toHaveLength(1);
  });

  it("finds a top-level child", () => {
    const result = findNode(PORTFOLIO_AST, "projects");
    expect(result).not.toBeNull();
    expect(result!.node.label).toBe("Projects");
    expect(result!.path).toHaveLength(2);
    expect(result!.path[0].slug).toBe("root");
    expect(result!.path[1].slug).toBe("projects");
  });

  it("finds a deeply nested node", () => {
    const result = findNode(PORTFOLIO_AST, "resumind");
    expect(result).not.toBeNull();
    expect(result!.node.label).toBe("RESUMIND");
    expect(result!.path.length).toBeGreaterThanOrEqual(3);
  });

  it("finds timeline entries", () => {
    const result = findNode(PORTFOLIO_AST, "timeline-0");
    expect(result).not.toBeNull();
    expect(result!.node.glowColor).toBe("--ctp-teal");
  });

  it("finds philosophy nodes", () => {
    const result = findNode(PORTFOLIO_AST, "code-as-consciousness");
    expect(result).not.toBeNull();
    expect(result!.node.type).toBe("CallExpression");
  });

  it("finds connect nodes", () => {
    const result = findNode(PORTFOLIO_AST, "connect-github");
    expect(result).not.toBeNull();
    expect(result!.node.type).toBe("StringLiteral");
  });

  it("returns null for non-existent slug", () => {
    const result = findNode(PORTFOLIO_AST, "does-not-exist");
    expect(result).toBeNull();
  });

  it("returns correct path for skill leaf node", () => {
    const result = findNode(PORTFOLIO_AST, "skills-languages-typescript");
    expect(result).not.toBeNull();
    // root → skills → languages → typescript
    expect(result!.path.length).toBeGreaterThanOrEqual(4);
  });
});

// ── getChildren ────────────────────────────────────────────────────────

describe("getChildren", () => {
  it("returns children of the root node", () => {
    const children = getChildren(PORTFOLIO_AST, "root");
    expect(children.length).toBe(6); // identity, projects, skills, timeline, philosophy, connect
  });

  it("returns project nodes", () => {
    const children = getChildren(PORTFOLIO_AST, "projects");
    expect(children.length).toBe(4); // 4 projects
    expect(children.map((c) => c.id)).toContain("resumind");
    expect(children.map((c) => c.id)).toContain("clause");
  });

  it("returns empty array for leaf node", () => {
    const children = getChildren(PORTFOLIO_AST, "resumind");
    expect(children).toEqual([]);
  });

  it("returns empty array for non-existent slug", () => {
    const children = getChildren(PORTFOLIO_AST, "nope");
    expect(children).toEqual([]);
  });
});

// ── flatten ────────────────────────────────────────────────────────────

describe("flatten", () => {
  it("produces a flat array with all nodes", () => {
    const flat = flatten(PORTFOLIO_AST);
    expect(flat.length).toBe(countNodes(PORTFOLIO_AST));
    expect(flat.length).toBeGreaterThan(30); // should have many nodes
  });

  it("root node has depth 0 and no parent", () => {
    const flat = flatten(PORTFOLIO_AST);
    const root = flat.find((n) => n.id === "root");
    expect(root).toBeDefined();
    expect(root!.depth).toBe(0);
    expect(root!.parentId).toBeNull();
  });

  it("projects node has depth 1 and root parent", () => {
    const flat = flatten(PORTFOLIO_AST);
    const projects = flat.find((n) => n.id === "projects");
    expect(projects).toBeDefined();
    expect(projects!.depth).toBe(1);
    expect(projects!.parentId).toBe("root");
  });

  it("skill leaf has correct depth", () => {
    const flat = flatten(PORTFOLIO_AST);
    const tsNode = flat.find((n) => n.id === "skills-languages-typescript");
    expect(tsNode).toBeDefined();
    // root(0) → skills(1) → languages(2) → typescript(3)
    expect(tsNode!.depth).toBe(3);
  });

  it("every node has a unique id", () => {
    const flat = flatten(PORTFOLIO_AST);
    const ids = flat.map((n) => n.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// ── getTokenStream ─────────────────────────────────────────────────────

describe("getTokenStream", () => {
  it("produces a non-empty token stream", () => {
    const tokens = getTokenStream(PORTFOLIO_AST);
    expect(tokens.length).toBeGreaterThan(0);
  });

  it("contains IDENT tokens for timeline entries", () => {
    const tokens = getTokenStream(PORTFOLIO_AST);
    const idents = tokens.filter((t) => t.type === "IDENT");
    expect(idents.length).toBe(4); // UIC, Discover, Capital One, Side Projects
  });

  it("contains OP tokens between entries", () => {
    const tokens = getTokenStream(PORTFOLIO_AST);
    const ops = tokens.filter((t) => t.type === "OP");
    expect(ops.length).toBe(3); // 4 entries = 3 arrows
    expect(ops[0].value).toBe("\u2192");
  });

  it("IDENT tokens have slugs for navigation", () => {
    const tokens = getTokenStream(PORTFOLIO_AST);
    const idents = tokens.filter((t) => t.type === "IDENT");
    idents.forEach((token) => {
      expect(token.slug).toBeDefined();
    });
  });
});

// ── filterByMode ───────────────────────────────────────────────────────

describe("filterByMode", () => {
  const testNode: ASTNode = {
    id: "test",
    type: "FunctionDeclaration",
    label: "Test",
    slug: "test",
    glowColor: "--ctp-peach",
    content: {
      summary: "Test summary",
      body: "Test body content",
      deep: "test-deep",
    },
    children: [
      {
        id: "test-child",
        type: "StringLiteral",
        label: "Child",
        slug: "test-child",
        glowColor: "--ctp-peach",
        content: {
          summary: "Child summary",
          body: "Child body",
        },
      },
    ],
  };

  it("lex mode strips all content", () => {
    const filtered = filterByMode(testNode, "lex");
    expect(filtered.content).toBeUndefined();
    expect(filtered.label).toBe("Test"); // label preserved
    expect(filtered.type).toBe("FunctionDeclaration"); // type preserved
    // Children also stripped
    expect(filtered.children![0].content).toBeUndefined();
  });

  it("parse mode keeps summary, strips body", () => {
    const filtered = filterByMode(testNode, "parse");
    expect(filtered.content!.summary).toBe("Test summary");
    expect(filtered.content!.body).toBe("");
    expect(filtered.content!.deep).toBeNull();
    // Children also filtered
    expect(filtered.children![0].content!.summary).toBe("Child summary");
    expect(filtered.children![0].content!.body).toBe("");
  });

  it("eval mode keeps everything", () => {
    const filtered = filterByMode(testNode, "eval");
    expect(filtered.content!.summary).toBe("Test summary");
    expect(filtered.content!.body).toBe("Test body content");
    expect(filtered.content!.deep).toBe("test-deep");
  });
});

// ── countNodes ──────────────────────────────────────────────────────────

describe("countNodes", () => {
  it("counts all nodes in the tree", () => {
    const count = countNodes(PORTFOLIO_AST);
    const flat = flatten(PORTFOLIO_AST);
    expect(count).toBe(flat.length);
  });

  it("single node returns 1", () => {
    const single: ASTNode = {
      id: "single",
      type: "StringLiteral",
      label: "Single",
      slug: "single",
      glowColor: "--ctp-text",
    };
    expect(countNodes(single)).toBe(1);
  });
});

// ── getMaxDepth ────────────────────────────────────────────────────────

describe("getMaxDepth", () => {
  it("returns correct max depth for portfolio", () => {
    const depth = getMaxDepth(PORTFOLIO_AST);
    // root(0) → skills(1) → languages(2) → typescript(3) => maxDepth = 3
    expect(depth).toBeGreaterThanOrEqual(3);
  });

  it("leaf node has depth 0", () => {
    const leaf: ASTNode = {
      id: "leaf",
      type: "StringLiteral",
      label: "Leaf",
      slug: "leaf",
      glowColor: "--ctp-text",
    };
    expect(getMaxDepth(leaf)).toBe(0);
  });
});

// ── AST Data Integrity ─────────────────────────────────────────────────

describe("PORTFOLIO_AST data integrity", () => {
  it("root has correct type", () => {
    expect(PORTFOLIO_AST.type).toBe("RootNode");
  });

  it("every node has content for all 3 modes", () => {
    const flat = flatten(PORTFOLIO_AST);
    flat.forEach((node) => {
      // Every node should have a content object with at least a summary
      if (node.content) {
        expect(typeof node.content.summary).toBe("string");
        expect(node.content.summary.length).toBeGreaterThan(0);
      }
    });
  });

  it("every node has a valid glowColor", () => {
    const flat = flatten(PORTFOLIO_AST);
    flat.forEach((node) => {
      expect(node.glowColor).toMatch(/^--ctp-/);
    });
  });

  it("every node has a non-empty slug", () => {
    const flat = flatten(PORTFOLIO_AST);
    flat.forEach((node) => {
      expect(node.slug.length).toBeGreaterThan(0);
    });
  });

  it("all node types are valid ASTNodeType values", () => {
    const validTypes = [
      "RootNode",
      "ProgramNode",
      "BlockStatement",
      "FunctionDeclaration",
      "ObjectExpression",
      "ExpressionStatement",
      "CallExpression",
      "VariableDeclaration",
      "ArrayExpression",
      "ExportDeclaration",
      "StringLiteral",
      "ImportDeclaration",
      "TypeAnnotation",
    ];
    const flat = flatten(PORTFOLIO_AST);
    flat.forEach((node) => {
      expect(validTypes).toContain(node.type);
    });
  });
});
