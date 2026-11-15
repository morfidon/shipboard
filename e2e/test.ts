import { test as base } from "@playwright/test";
import { serverFor } from "./servers";

// Our own test(): Playwright's, with two of its settings chosen per worker.
// Every spec file imports test and expect from here.
export const test = base.extend<{ role?: "owner" | "member" | "viewer" }>({
  // Who the test is signed in as: test.use({ role: "member" }).
  role: [undefined, { option: true }],
  // The worker's own server.
  baseURL: async ({}, use, testInfo) => {
    await use(serverFor(testInfo.parallelIndex).url);
  },
  // The saved sign-in for that server.
  storageState: async ({ role }, use, testInfo) => {
    const { port } = serverFor(testInfo.parallelIndex);
    await use(role ? `playwright/.auth/${role}-${port}.json` : undefined);
  },
});

export { expect } from "@playwright/test";
