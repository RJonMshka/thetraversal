import { defineConfig } from "@playwright/test";

const PORT = 3100;
// Set PARITY_BASE_URL to run the snapshots against a deployed site (e.g. a Vercel preview) instead of a local build.
const REMOTE = process.env.PARITY_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: REMOTE ?? `http://localhost:${PORT}`,
    reducedMotion: "reduce",
    colorScheme: "dark",
  },
  expect: {
    toHaveScreenshot: { animations: "disabled", caret: "hide" },
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  // Parity is measured against the shell's production build, not the dev server.
  webServer: REMOTE
    ? undefined
    : {
        command: `pnpm --filter @tv/shell build && pnpm --filter @tv/shell start --port ${PORT}`,
        url: `http://localhost:${PORT}`,
        timeout: 300_000,
        reuseExistingServer: !process.env.CI,
      },
});
