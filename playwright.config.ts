import { defineConfig, devices } from "@playwright/test";
import { baseURL, databaseUrl, port } from "./e2e/server";

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
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Each test on its own line in the terminal, and the HTML report on disk. */
  reporter: [["list"], ["html", { open: "never" }]],
  /* A fresh database before the tests. */
  globalSetup: "./e2e/global-setup.ts",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Build the app, then start it the way it runs in production. */
  webServer: {
    command: `pnpm build && pnpm start --port ${port}`,
    url: baseURL,
    // A server we didn't start may be an old build, or use another database.
    reuseExistingServer: false,
    env: {
      DATABASE_URL: databaseUrl(),
      BETTER_AUTH_URL: baseURL,
    },
  },
});
