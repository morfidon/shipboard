import { expect, test } from "@playwright/test";

test("the home page leads to sign-up", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Shipboard" })).toBeVisible();

  await page.getByRole("link", { name: "Get started" }).click();

  await expect(page).toHaveURL("/sign-up");
});
