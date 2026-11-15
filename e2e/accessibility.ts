import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// axe checks the page as it is right now. A heading can arrive before the
// rest of a streamed page, so the test first waits for the content it wants
// checked, and here we wait until no loading placeholder (a skeleton) is
// left on screen, and for the title, which a streamed page can fill in a
// moment later. Every problem axe finds becomes one line, so a failing test
// names each rule that broke.
export async function expectNoAccessibilityProblems(page: Page) {
  await expect(page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0);
  await expect(page).toHaveTitle(/Shipboard/);
  const results = await new AxeBuilder({ page }).analyze();
  const problems = results.violations.map((v) => `${v.id}: ${v.help}`);
  expect(problems).toEqual([]);
}
