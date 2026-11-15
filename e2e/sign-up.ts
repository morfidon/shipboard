import type { Page } from "@playwright/test";
import { expectNoAccessibilityProblems } from "./accessibility";
import { newestLink } from "./inbox";
import { expect } from "./test";

// Signs up through the form, then opens the link from the inbox.
export async function signUp(
  page: Page,
  port: number,
  name: string,
  email: string,
) {
  await page.goto("/sign-up");
  await expectNoAccessibilityProblems(page);
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a-long-test-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status")).toContainText(email);

  let link: string | undefined;
  await expect
    .poll(async () => (link = await newestLink(port, email)))
    .toContain("/verify-email");
  await page.goto(link!);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}
