import type pg from "pg";
import { expect, test } from "./test";

test.use({ role: "member" });

// The test holds the issue table in its worker's database, like a busy
// database would: every query that reads issues waits until it lets go.
async function holdIssues(db: pg.Client) {
  await db.query("begin");
  await db.query("lock table issue in access exclusive mode");
}

// Postgres cancels the queries that wait for the table, the same error the
// app gets when its database gives up. Returns how many it cancelled.
async function failWaitingQueries(db: pg.Client) {
  const { rowCount } = await db.query(
    `select pg_cancel_backend(pid) from pg_stat_activity
     where datname = current_database() and wait_event_type = 'Lock'`,
  );
  return rowCount;
}

async function websiteRelaunch(db: pg.Client) {
  const { rows } = await db.query(
    "select id from project where name = 'Website relaunch'",
  );
  return `/projects/${rows[0].id}`;
}

test("shows a skeleton while the issues load, then the list", async ({
  page,
  db,
}) => {
  const url = await websiteRelaunch(db);
  await holdIssues(db);
  try {
    // The page streams, and its end waits for the issues: wait only for
    // its start.
    await page.goto(url, { waitUntil: "commit" });

    await expect(page.getByRole("status")).toHaveText("Loading issues…");
  } finally {
    await db.query("rollback");
  }
  await expect(
    page.getByRole("link", { name: "Proofread every page" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("shows the error page when the issues fail, and Try again loads them", async ({
  page,
  db,
}) => {
  const url = await websiteRelaunch(db);
  await holdIssues(db);
  try {
    await page.goto(url, { waitUntil: "commit" });
    await expect(page.getByRole("status")).toHaveText("Loading issues…");

    await expect.poll(() => failWaitingQueries(db)).toBeGreaterThan(0);
  } finally {
    await db.query("rollback");
  }
  await expect(
    page.getByRole("heading", { name: "Something went wrong" }),
  ).toBeVisible();

  // The database answers again: the button tries once more.
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("link", { name: "Proofread every page" }),
  ).toBeVisible();
});
