import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { organization, project } from "@/db/schema";
import { getProject } from "@/lib/data";

describe("getProject", () => {
  it("finds each project by its id", async () => {
    // Arrange: a team and two projects in the test database.
    await db
      .insert(organization)
      .values({ id: "org-1", name: "Acme", slug: "acme" });
    const [website, mobile] = await db
      .insert(project)
      .values([
        { organizationId: "org-1", name: "Website relaunch" },
        { organizationId: "org-1", name: "Mobile app" },
      ])
      .returning();

    // Act
    const foundWebsite = await getProject(website.id);
    const foundMobile = await getProject(mobile.id);

    // Assert: each id gives back its own project.
    expect(foundWebsite).toEqual({
      id: website.id,
      name: "Website relaunch",
      description: "",
    });
    expect(foundMobile).toEqual({
      id: mobile.id,
      name: "Mobile app",
      description: "",
    });
  });

  it("returns undefined for an id that isn't a UUID", async () => {
    expect(await getProject("999")).toBeUndefined();
  });
});
