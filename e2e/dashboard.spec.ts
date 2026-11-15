import type { Page } from "@playwright/test";
import { signUp } from "./sign-up";
import { expect, test as base } from "./test";

// Our test(), plus a team of the test's own: a new owner signs up and starts
// a project with the New project form, so the dashboard's saved copy hears
// about it. Nobody else is in that team, so no other test ever sees its
// numbers. Afterwards the team goes away with its owner, projects and issues
// (on delete cascade), also when something on the way fails.
const test = base.extend<{ ownProject: string }>({
  ownProject: async ({ page, server, db }, use) => {
    const id = crypto.randomUUID().slice(0, 8);
    const email = `dana-${id}@example.com`;
    const name = `Status check ${id}`;
    try {
      await signUp(page, server.port, "Dana Ortiz", email);
      await page.getByRole("link", { name: "Projects" }).click();
      await page.getByLabel("Name").fill(name);
      await page.getByRole("button", { name: "Create project" }).click();
      await expect(page.getByRole("heading", { name })).toBeVisible();
      await use(name);
    } finally {
      await db.query(
        `delete from organization where id in (
           select member.organization_id from member
           join "user" on "user".id = member.user_id
           where "user".email = $1)`,
        [email],
      );
      await db.query(`delete from "user" where email = $1`, [email]);
    }
  },
});

// One number on a project's card on the dashboard: "To do", "In progress"
// or "Done".
function count(page: Page, project: string, label: string) {
  return page
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: project, exact: true }) })
    .locator("dl > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .getByRole("definition");
}

test("a status change shows on the dashboard, also after Back and Forward", async ({
  page,
  ownProject,
  projectPage,
}) => {
  // The form left us on the new project's page.
  const title = `Check the dashboard ${crypto.randomUUID().slice(0, 8)}`;
  await projectPage.createIssue(title);

  // The dashboard, by the sidebar: the numbers before the change.
  // exact: names match in part by default, and our issue's title has the
  // word "dashboard" in it too.
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page).toHaveURL("/dashboard");
  const done = Number(await count(page, ownProject, "Done").textContent());

  // Back to the project, and the new issue moves to Done.
  await page.goBack();
  await page
    .getByRole("listitem")
    .filter({ hasText: title })
    .getByRole("button", { name: "To do" })
    .click();
  await page.getByRole("menuitemradio", { name: "Done" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: title }),
  ).toContainText("Done");

  // Forward to the dashboard the browser kept: no reload.
  await page.goForward();
  await expect(page).toHaveURL("/dashboard");
  await expect(count(page, ownProject, "Done")).toHaveText(String(done + 1));
});

test.describe("two teams", () => {
  // Signed in as Maya, the owner of Acme.
  test.use({ role: "owner" });

  test("two teams signed in at the same time each see only their own numbers", async ({
    page,
    browser,
    server,
  }) => {
    const globex = await browser.newContext({
      storageState: `playwright/.auth/globex-${server.port}.json`,
    });
    const gina = await globex.newPage();

    await Promise.all([page.goto("/dashboard"), gina.goto("/dashboard")]);

    await expect(
      page.getByRole("link", { name: "Website relaunch" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Customer portal" }),
    ).toHaveCount(0);
    await expect(
      gina.getByRole("link", { name: "Customer portal" }),
    ).toBeVisible();
    await expect(
      gina.getByRole("link", { name: "Website relaunch" }),
    ).toHaveCount(0);
    await expect(count(gina, "Customer portal", "To do")).toHaveText("3");
    await globex.close();
  });
});
