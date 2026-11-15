import { test as base } from "@playwright/test";
import pg from "pg";
import { ProjectPage } from "./pages/project-page";
import { serverFor } from "./servers";

type Role = "owner" | "member" | "viewer";

// What a test can ask for, besides Playwright's own page, request and so on.
type TestFixtures = {
  // Who the test is signed in as: test.use({ role: "member" }).
  role: Role | undefined;
  // A new, empty project in Acme, only for this test.
  project: { id: string; name: string };
  projectPage: ProjectPage;
  // Runs before every test by itself: see below.
  freshCounters: void;
};

// Made once per worker, and shared by its tests.
type WorkerFixtures = {
  // The worker's own server and database.
  server: ReturnType<typeof serverFor>;
  db: pg.Client;
};

// Our own test(): Playwright's, plus our fixtures. Every spec file imports
// test and expect from here.
export const test = base.extend<TestFixtures, WorkerFixtures>({
  server: [
    async ({}, use, workerInfo) => {
      await use(serverFor(workerInfo.parallelIndex));
    },
    { scope: "worker" },
  ],
  db: [
    async ({ server }, use) => {
      const client = new pg.Client({ connectionString: server.databaseUrl });
      await client.connect();
      await use(client);
      await client.end();
    },
    { scope: "worker" },
  ],
  role: [undefined, { option: true }],
  // Playwright's own settings, chosen for the worker's server.
  baseURL: async ({ server }, use) => {
    await use(server.url);
  },
  storageState: async ({ role, server }, use) => {
    await use(
      role ? `playwright/.auth/${role}-${server.port}.json` : undefined,
    );
  },
  // Set up before the test, cleared away after it.
  project: async ({ db }, use) => {
    const name = `Project ${crypto.randomUUID().slice(0, 8)}`;
    const { rows } = await db.query(
      `insert into project (organization_id, name)
       select id, $1 from organization where slug = 'acme'
       returning id`,
      [name],
    );
    await use({ id: rows[0].id, name });
    // Its issues go with it.
    await db.query("delete from project where id = $1", [rows[0].id]);
  },
  projectPage: async ({ page }, use) => {
    await use(new ProjectPage(page));
  },
  // Every test starts with empty rate-limit counters, the way every Vitest
  // test starts with empty tables. Our sign-ups all come from one address
  // (::1), so without this a worker's 6th sign-up in an hour is refused.
  freshCounters: [
    async ({ db }, use) => {
      await db.query("delete from rate_limit");
      await use();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
