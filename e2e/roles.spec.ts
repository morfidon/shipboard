import { expect, test } from "./test";

test.describe("a viewer", () => {
  test.use({ role: "viewer" });

  test("reads the issues, with no way to add one", async ({ page }) => {
    await page.goto("/projects");
    await page.getByRole("link", { name: "Website relaunch" }).click();

    await expect(page.getByText("Proofread every page")).toBeVisible();
    await expect(page.getByRole("link", { name: "New issue" })).toHaveCount(0);
  });
});

test.describe("a member", () => {
  test.use({ role: "member" });

  test("sees the plan, but can't change it", async ({ page }) => {
    await page.goto("/team");

    await expect(page.getByRole("heading", { name: "Plan" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Upgrade to Pro" }),
    ).toHaveCount(0);
  });
});

test.describe("an owner", () => {
  test.use({ role: "owner" });

  test("can upgrade the team", async ({ page }) => {
    await page.goto("/team");

    await expect(
      page.getByRole("button", { name: "Upgrade to Pro" }),
    ).toBeVisible();
  });
});
