import { expect, test as setup } from "@playwright/test";
import { allServers } from "./servers";

// One person from the seed for each role, all in Acme.
const people = {
  owner: "maya@example.com",
  member: "lena@example.com",
  viewer: "priya@example.com",
};

// A session is a row in one database, so every server needs its own: this
// signs in once per role on every server, and saves the browser's cookies
// to a file. A test that loads the file starts signed in.
for (const server of allServers()) {
  for (const [role, email] of Object.entries(people)) {
    setup(`sign in as ${role} on ${server.port}`, async ({ page }) => {
      await page.goto(`${server.url}/sign-in`);
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill("shipboard-demo");
      await page.getByRole("button", { name: "Sign in" }).click();
      // The session cookie is set when the dashboard shows.
      await expect(
        page.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();

      const file = `playwright/.auth/${role}-${server.port}.json`;
      await page.context().storageState({ path: file });
    });
  }
}
