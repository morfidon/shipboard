import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/lib/current-user";
import {
  getIssue,
  getIssues,
  getPendingInvitations,
  getProject,
  getProjects,
  getProjectStats,
  getUsers,
} from "@/lib/data";
import {
  createInvitation,
  createIssue,
  createMember,
  createOrganization,
  createProject,
  createUser,
} from "./factories";

// Every read asks who is signed in. Tests make no request, so a mock answers.
vi.mock("@/lib/current-user", () => ({ getCurrentUser: vi.fn() }));

let organizationId: string;

beforeEach(async () => {
  organizationId = (await createOrganization()).id;
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: "maya",
    name: "Maya Chen",
    organizationId,
    role: "owner",
  });
});

// A project in the signed-in person's team. createProject() alone puts it
// in a new organization: someone else's.
function ourProject(values: { name?: string } = {}) {
  return createProject({ ...values, organizationId });
}

describe("getProject", () => {
  it("finds each project by its id", async () => {
    const website = await ourProject({ name: "Website relaunch" });
    const mobile = await ourProject({ name: "Mobile app" });

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

  it("hides another team's project", async () => {
    const theirs = await createProject({ name: "Customer portal" });

    expect(await getProject(theirs.id)).toBeUndefined();
  });
});

describe("getProjects", () => {
  it("lists the projects by name", async () => {
    await ourProject({ name: "Mobile app" });
    await ourProject({ name: "Infrastructure" });

    const projects = await getProjects();

    expect(projects.map((p) => p.name)).toEqual([
      "Infrastructure",
      "Mobile app",
    ]);
  });

  it("never lists another team's projects", async () => {
    await ourProject({ name: "Website relaunch" });
    await createProject({ name: "Customer portal" });

    const projects = await getProjects();

    expect(projects.map((p) => p.name)).toEqual(["Website relaunch"]);
  });
});

describe("getProjectStats", () => {
  it("counts each project's issues by status, without archived ones", async () => {
    const website = await ourProject({ name: "Website relaunch" });
    const mobile = await ourProject({ name: "Mobile app" });
    await createIssue({ projectId: website.id, status: "todo" });
    await createIssue({ projectId: website.id, status: "todo" });
    await createIssue({ projectId: website.id, status: "in_progress" });
    await createIssue({ projectId: website.id, status: "done" });
    await createIssue({
      projectId: website.id,
      status: "todo",
      archivedAt: new Date(),
    });

    expect(await getProjectStats()).toEqual([
      { id: mobile.id, name: "Mobile app", todo: 0, inProgress: 0, done: 0 },
      {
        id: website.id,
        name: "Website relaunch",
        todo: 2,
        inProgress: 1,
        done: 1,
      },
    ]);
  });

  it("never counts another team's projects", async () => {
    await ourProject({ name: "Website relaunch" });
    const theirs = await createProject({ name: "Customer portal" });
    await createIssue({ projectId: theirs.id });

    const stats = await getProjectStats();

    expect(stats.map((s) => s.name)).toEqual(["Website relaunch"]);
  });
});

describe("getUsers", () => {
  it("lists only the people in the team", async () => {
    const lena = await createUser({ name: "Lena Fischer" });
    const gina = await createUser({ name: "Gina Park" });
    await createMember({ organizationId, userId: lena.id });
    await createMember({ userId: gina.id });

    const people = await getUsers();

    expect(people.map((p) => p.name)).toEqual(["Lena Fischer"]);
  });
});

describe("getPendingInvitations", () => {
  it("lists only this team's open invitations", async () => {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await createInvitation({ organizationId, email: "open@example.com" });
    await createInvitation({
      organizationId,
      email: "joined@example.com",
      status: "accepted",
    });
    await createInvitation({
      organizationId,
      email: "late@example.com",
      expiresAt: hourAgo,
    });
    await createInvitation({ email: "elsewhere@example.com" });

    const invitations = await getPendingInvitations();

    expect(invitations.map((i) => i.email)).toEqual(["open@example.com"]);
  });
});

describe("getIssues", () => {
  it("never shows another team's issues", async () => {
    const theirs = await createProject({ name: "Customer portal" });
    await createIssue({ projectId: theirs.id, title: "Add invoice downloads" });

    const { items, total } = await getIssues(theirs.id);

    expect(items).toEqual([]);
    expect(total).toBe(0);
  });

  it("never shows another project's issues", async () => {
    const website = await ourProject({ name: "Website relaunch" });
    const mobile = await ourProject({ name: "Mobile app" });
    await createIssue({ projectId: website.id, title: "Add a 404 page" });
    await createIssue({ projectId: mobile.id, title: "Fix the login screen" });

    const { items, total } = await getIssues(website.id);

    expect(items.map((i) => i.title)).toEqual(["Add a 404 page"]);
    expect(total).toBe(1);
  });

  it("hides archived issues", async () => {
    const project = await ourProject();
    await createIssue({ projectId: project.id, title: "Add a 404 page" });
    await createIssue({
      projectId: project.id,
      title: "Old idea",
      archivedAt: new Date(),
    });

    const { items, total } = await getIssues(project.id);

    expect(items.map((i) => i.title)).toEqual(["Add a 404 page"]);
    expect(total).toBe(1);
  });

  it("filters by one status or several", async () => {
    const project = await ourProject();
    await createIssue({
      projectId: project.id,
      title: "Add a 404 page",
      status: "todo",
    });
    await createIssue({
      projectId: project.id,
      title: "Set up analytics",
      status: "in_progress",
    });
    await createIssue({
      projectId: project.id,
      title: "Write the copy",
      status: "done",
    });

    const done = await getIssues(project.id, { statuses: ["done"] });
    // "Open" in the app is two statuses at once.
    const open = await getIssues(project.id, {
      statuses: ["todo", "in_progress"],
    });

    expect(done.items.map((i) => i.title)).toEqual(["Write the copy"]);
    // Sorted, because the order isn't what this test is about.
    expect(open.items.map((i) => i.title).sort()).toEqual([
      "Add a 404 page",
      "Set up analytics",
    ]);
    expect(open.total).toBe(2);
  });

  it("filters by assignee and shows their name", async () => {
    const project = await ourProject();
    const maya = await createUser({ name: "Maya Chen" });
    const tom = await createUser({ name: "Tom Novak" });
    await createIssue({
      projectId: project.id,
      title: "Pick a font",
      assigneeId: maya.id,
    });
    await createIssue({
      projectId: project.id,
      title: "Fix the menu",
      assigneeId: tom.id,
    });
    await createIssue({ projectId: project.id, title: "Nobody's issue" });

    const { items, total } = await getIssues(project.id, {
      assigneeId: maya.id,
    });

    expect(items).toEqual([
      {
        id: expect.any(String),
        title: "Pick a font",
        status: "todo",
        assignee: "Maya Chen",
      },
    ]);
    expect(total).toBe(1);
  });

  it("splits the issues into pages of ten", async () => {
    const project = await ourProject();
    const createdIds: string[] = [];
    for (let n = 1; n <= 12; n++) {
      const created = await createIssue({
        projectId: project.id,
        title: `Issue ${n}`,
      });
      createdIds.push(created.id);
    }

    const first = await getIssues(project.id, { page: 1 });
    const second = await getIssues(project.id, { page: 2 });

    expect(first.items).toHaveLength(10);
    expect(second.items).toHaveLength(2);
    expect(first.total).toBe(12);
    // Together, the two pages show every issue exactly once.
    const shownIds = [...first.items, ...second.items].map((i) => i.id);
    expect(shownIds.sort()).toEqual(createdIds.sort());
  });

  it("shows the last page for a page past the end", async () => {
    const project = await ourProject();
    for (let n = 1; n <= 12; n++) {
      await createIssue({ projectId: project.id, title: `Issue ${n}` });
    }

    // Page 3 is gone: its last issue was archived, or a link says ?page=999.
    const result = await getIssues(project.id, { page: 3 });

    expect(result.page).toBe(2);
    expect(result.items).toHaveLength(2);
  });

  it("puts the newest issue first", async () => {
    const project = await ourProject();
    await createIssue({
      projectId: project.id,
      title: "Older",
      createdAt: new Date("2026-01-01"),
    });
    await createIssue({
      projectId: project.id,
      title: "Newer",
      createdAt: new Date("2026-02-01"),
    });

    const { items } = await getIssues(project.id);

    expect(items.map((i) => i.title)).toEqual(["Newer", "Older"]);
  });
});

describe("getIssue", () => {
  it("finds an issue only for its own organization", async () => {
    const ours = await ourProject();
    const theirs = await createProject();
    const mine = await createIssue({ projectId: ours.id });
    const notMine = await createIssue({ projectId: theirs.id });

    expect(await getIssue(mine.id)).toMatchObject({
      id: mine.id,
      projectId: ours.id,
    });
    expect(await getIssue(notMine.id)).toBeUndefined();
  });

  it("hides archived issues", async () => {
    const project = await ourProject();
    const archived = await createIssue({
      projectId: project.id,
      archivedAt: new Date(),
    });

    expect(await getIssue(archived.id)).toBeUndefined();
  });
});
