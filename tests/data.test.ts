import { describe, expect, it } from "vitest";
import { getProject, getProjects } from "@/lib/data";
import { createProject } from "./factories";

describe("getProject", () => {
  it("finds each project by its id", async () => {
    const website = await createProject({ name: "Website relaunch" });
    const mobile = await createProject({ name: "Mobile app" });

    expect(await getProject(website.id)).toEqual({
      id: website.id,
      name: "Website relaunch",
      description: "",
    });
    expect(await getProject(mobile.id)).toEqual({
      id: mobile.id,
      name: "Mobile app",
      description: "",
    });
  });

  it("returns undefined for an id that isn't a UUID", async () => {
    expect(await getProject("999")).toBeUndefined();
  });
});

describe("getProjects", () => {
  it("lists the projects by name", async () => {
    await createProject({ name: "Mobile app" });
    await createProject({ name: "Infrastructure" });

    const projects = await getProjects();

    expect(projects.map((p) => p.name)).toEqual([
      "Infrastructure",
      "Mobile app",
    ]);
  });
});
