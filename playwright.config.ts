import { defineConfig, devices } from "@playwright/test";
import { allServers, workers } from "./e2e/servers";

// The test settings, and nothing else: never .env.local, where the real
// sandbox keys live. A value set in the terminal still wins.
process.loadEnvFile(".env.test");

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* One worker for each test server. */
  workers,
  /* Each test on its own line in the terminal, and the HTML report on disk. */
  reporter: [["list"], ["html", { open: "never" }]],
  /* A fresh database for every worker before the tests. */
  globalSetup: "./e2e/global-setup.ts",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    /* Signs in once per role, before the tests that need it. */
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],

  /* Build the app once, then start one production server per worker. */
  webServer: allServers().map((server, index) => ({
    command:
      (index === 0 ? "pnpm build && " : "") +
      `pnpm start --port ${server.port}`,
    url: server.url,
    // A server we didn't start may be an old build, or use another database.
    reuseExistingServer: false,
    env: {
      DATABASE_URL: server.databaseUrl,
      BETTER_AUTH_URL: server.url,
    },
  })),
});
