import { expect, test } from "./test";

// Signed in as Lena, a member of Acme.
test.use({ role: "member" });

test("a member creates an issue and sees it in the list", async ({
  project,
  projectPage,
}) => {
  await projectPage.open(project.id);

  await projectPage.createIssue("Check the footer links");

  await expect(projectPage.issue("Check the footer links")).toBeVisible();
});
