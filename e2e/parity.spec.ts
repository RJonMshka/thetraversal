import { test, expect } from "@playwright/test";

// Visual parity baseline (architecture/MIGRATION.md, Phase 0).
// Every later phase must keep these snapshots passing unless it changes behavior on purpose.

const ROUTES = [
  { name: "landing", path: "/" },
  // The AST moved from /tree to /t/ast in Phase 3; snapshots keep their
  // Phase 0 names so the comparison is against the original tree page.
  { name: "tree-lex", path: "/t/ast?mode=lex" },
  { name: "tree-parse", path: "/t/ast?mode=parse" },
  { name: "tree-eval", path: "/t/ast?mode=eval" },
  { name: "node-reachble", path: "/node/reachble" },
  { name: "node-rewiring-the-interface", path: "/node/rewiring-the-interface" },
  { name: "node-timeline-0", path: "/node/timeline-0" },
] as const;

const THEMES = ["mint", "paper"] as const;

for (const theme of THEMES) {
  test.describe(`theme: ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      // Same key and shape as saveTheme() in @tv/tokens (packages/tokens/src/themes.ts).
      await page.addInitScript((t) => {
        localStorage.setItem("tv.theme.cmd", JSON.stringify({ theme: t, font: "mono" }));
      }, theme);
    });

    for (const route of ROUTES) {
      test(route.name, async ({ page }) => {
        await page.goto(route.path);
        await page.waitForLoadState("networkidle");
        if (route.path.startsWith("/t/")) {
          await page.locator('[data-target-state="ready"]').waitFor();
        }
        await page.evaluate(() => document.fonts.ready);

        await expect(page).toHaveScreenshot(`${route.name}-${theme}.png`, { fullPage: true });
      });
    }
  });
}
