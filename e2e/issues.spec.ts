import { expect, test } from "./test";

// Signed in as Lena, a member of Acme.
test.use({ role: "member" });

test("a member creates an issue and sees it in the list", async ({ page }) => {
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
