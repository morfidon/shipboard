import { expect, test } from "./test";

test.use({ role: "member" });

test("the sidebar takes a member from the dashboard to a project", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await page.getByRole("link", { name: "Projects" }).click();
  // The dashboard has a "Website relaunch" link too, and Next.js keeps the
  // dashboard, hidden, after we leave it. So first arrive, then click.
  await expect(page).toHaveURL("/projects");
  await page.getByRole("link", { name: "Website relaunch" }).click();

  await expect(
    page.getByRole("heading", { name: "Website relaunch" }),
  ).toBeVisible();
});
