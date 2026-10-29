import { test, expect } from "@playwright/test";

// Visual parity baseline (architecture/MIGRATION.md, Phase 0).
// Every later phase must keep these snapshots passing unless it changes behavior on purpose.

const ROUTES = [
  { name: "landing", path: "/" },
  { name: "tree-lex", path: "/tree?mode=lex" },
  { name: "tree-parse", path: "/tree?mode=parse" },
  { name: "tree-eval", path: "/tree?mode=eval" },
  { name: "node-reachble", path: "/node/reachble" },
  { name: "node-rewiring-the-interface", path: "/node/rewiring-the-interface" },
  { name: "node-timeline-0", path: "/node/timeline-0" },
] as const;

const THEMES = ["mint", "paper"] as const;

for (const theme of THEMES) {
  test.describe(`theme: ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      // Same key and shape as saveTheme() in src/lib/themes.ts.
      await page.addInitScript((t) => {
        localStorage.setItem("tv.theme.cmd", JSON.stringify({ theme: t, font: "mono" }));
      }, theme);
    });

    for (const route of ROUTES) {
      test(route.name, async ({ page }) => {
        await page.goto(route.path);
        await page.waitForLoadState("networkidle");
        await page.evaluate(() => document.fonts.ready);

        await expect(page).toHaveScreenshot(`${route.name}-${theme}.png`, { fullPage: true });
      });
    }
  });
}
