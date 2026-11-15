import { expect, type Page } from "@playwright/test";

// What a person does on a project page, in one place. Tests say what they
// want ("create an issue"); only this file knows which buttons that takes.
export class ProjectPage {
  constructor(private readonly page: Page) {}

  async open(projectId: string) {
    await this.page.goto(`/projects/${projectId}`);
  }

  async createIssue(title: string) {
    await this.page.getByRole("link", { name: "New issue" }).click();
    const dialog = this.page.getByRole("dialog", { name: "New issue" });
    await dialog.getByLabel("Title").fill(title);
    await dialog.getByRole("button", { name: "Create issue" }).click();
    await expect(dialog).toBeHidden();
  }

  issue(title: string) {
    return this.page.getByRole("link", { name: title });
  }
}
