import { expect, test } from "@playwright/test";

test("a member creates an issue and sees it in the list", async ({ page }) => {
  // Sign in as Lena, a member of Acme.
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("lena@example.com");
  await page.getByLabel("Password").fill("shipboard-demo");
  await page.getByRole("button", { name: "Sign in" }).click();
  // Signed in once the dashboard shows.
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto("/projects");
  await page.getByRole("link", { name: "Website relaunch" }).click();
  await page.getByRole("link", { name: "New issue" }).click();

  const dialog = page.getByRole("dialog", { name: "New issue" });
  await dialog.getByLabel("Title").fill("Check the footer links");
  await dialog.getByRole("button", { name: "Create issue" }).click();

  // Web-first: each check waits until it's true, up to 5 seconds.
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Check the footer links" }),
  ).toBeVisible();
});
