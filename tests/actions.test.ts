import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { issue } from "@/db/schema";
import {
  archiveIssueAction,
  createIssueAction,
  updateIssueAction,
  updateIssueStatusAction,
} from "@/lib/actions";
import { getCurrentUser } from "@/lib/current-user";
import { createIssue, createOrganization, createProject } from "./factories";

// refresh() and redirect() only work inside a request that Next.js handles.
// Here we call the actions as plain functions, so we swap both for mocks:
// functions that do nothing and remember how they were called.
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
// Who is asking? Each test decides.
vi.mock("@/lib/current-user", () => ({ getCurrentUser: vi.fn() }));

let organizationId: string;

beforeEach(async () => {
  vi.clearAllMocks();
  organizationId = (await createOrganization()).id;
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: "maya",
    name: "Maya Chen",
    organizationId,
    role: "owner",
  });
});

function form(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value);
  }
  return formData;
}

async function titlesIn(projectId: string) {
  const rows = await db
    .select({ title: issue.title })
    .from(issue)
    .where(eq(issue.projectId, projectId));
  return rows.map((row) => row.title);
}

async function statusOf(issueId: string) {
  const [row] = await db
    .select({ status: issue.status })
    .from(issue)
    .where(eq(issue.id, issueId));
  return row.status;
}

async function archivedAt(issueId: string) {
  const [row] = await db
    .select({ archivedAt: issue.archivedAt })
    .from(issue)
    .where(eq(issue.id, issueId));
  return row.archivedAt;
}

describe("createIssueAction", () => {
  it("creates the issue and goes back to the project", async () => {
    const project = await createProject({ organizationId });

    await createIssueAction(
      project.id,
      {},
      form({ title: "Fix the logo", description: "Blurry on phones." }),
    );

    expect(await titlesIn(project.id)).toEqual(["Fix the logo"]);
    expect(redirect).toHaveBeenCalledWith(`/projects/${project.id}`);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("returns the errors and the typed text when the title is blank", async () => {
    const project = await createProject({ organizationId });

    const state = await createIssueAction(
      project.id,
      {},
      form({ title: "   ", description: "Steps to reproduce" }),
    );

    expect(state).toEqual({
      errors: { title: ["Give the issue a title."] },
      values: { title: "   ", description: "Steps to reproduce" },
    });
    expect(await titlesIn(project.id)).toEqual([]);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("refuses a project of another organization", async () => {
    // Without an organizationId, the factory makes a new organization.
    const theirs = await createProject();

    const state = await createIssueAction(
      theirs.id,
      {},
      form({ title: "Sneaky", description: "" }),
    );

    expect(state.message).toBe("Project not found.");
    expect(await titlesIn(theirs.id)).toEqual([]);
  });
});

describe("updateIssueStatusAction", () => {
  it("changes the status of our own issue", async () => {
    const project = await createProject({ organizationId });
    const ours = await createIssue({ projectId: project.id });

    expect(await updateIssueStatusAction(ours.id, "done")).toEqual({});
    expect(await statusOf(ours.id)).toBe("done");
    expect(refresh).toHaveBeenCalled();
  });

  it("refuses an issue of another organization", async () => {
    // A new project in a new organization.
    const theirs = await createIssue();

    expect(await updateIssueStatusAction(theirs.id, "done")).toEqual({
      error: "Issue not found.",
    });
    expect(await statusOf(theirs.id)).toBe("todo");
    expect(refresh).not.toHaveBeenCalled();
  });
});

// The same person, in our organization, with a different role.
function signedInAs(role: string) {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: "maya",
    name: "Maya Chen",
    organizationId,
    role,
  });
}

describe("updateIssueStatusAction, role by role", () => {
  it.each(["owner", "admin", "member"])(
    "lets the %s change a status",
    async (role) => {
      signedInAs(role);
      const project = await createProject({ organizationId });
      const ours = await createIssue({ projectId: project.id });

      expect(await updateIssueStatusAction(ours.id, "done")).toEqual({});
      expect(await statusOf(ours.id)).toBe("done");
    },
  );

  it("refuses a viewer", async () => {
    signedInAs("viewer");
    const project = await createProject({ organizationId });
    const ours = await createIssue({ projectId: project.id });

    await expect(updateIssueStatusAction(ours.id, "done")).rejects.toThrow(
      "A viewer can't update issues.",
    );
    expect(await statusOf(ours.id)).toBe("todo");
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("updateIssueAction", () => {
  it("saves the changes and goes back to the project", async () => {
    const project = await createProject({ organizationId });
    const ours = await createIssue({ projectId: project.id });

    await updateIssueAction(
      ours.id,
      {},
      form({ title: "Fix the logo on phones", description: "Too blurry." }),
    );

    expect(await titlesIn(project.id)).toEqual(["Fix the logo on phones"]);
    expect(redirect).toHaveBeenCalledWith(`/projects/${project.id}`);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("returns the errors when the title is blank", async () => {
    const project = await createProject({ organizationId });
    const ours = await createIssue({ projectId: project.id });

    const state = await updateIssueAction(
      ours.id,
      {},
      form({ title: "", description: "" }),
    );

    expect(state.errors).toEqual({ title: ["Give the issue a title."] });
    expect(await titlesIn(project.id)).toEqual(["Fix the logo"]);
  });

  it("refuses an issue of another organization", async () => {
    const theirs = await createIssue();

    const state = await updateIssueAction(
      theirs.id,
      {},
      form({ title: "Sneaky", description: "" }),
    );

    expect(state.message).toBe("Issue not found.");
    expect(await titlesIn(theirs.projectId)).toEqual(["Fix the logo"]);
  });

  it("refuses an issue that was archived meanwhile", async () => {
    const project = await createProject({ organizationId });
    // Say the edit form was still open in another tab.
    const archived = await createIssue({
      projectId: project.id,
      archivedAt: new Date(),
    });

    const state = await updateIssueAction(
      archived.id,
      {},
      form({ title: "Too late", description: "" }),
    );

    expect(state.message).toBe("Issue not found.");
    expect(await titlesIn(project.id)).toEqual(["Fix the logo"]);
  });
});

describe("archiveIssueAction", () => {
  it("archives our own issue", async () => {
    const project = await createProject({ organizationId });
    const ours = await createIssue({ projectId: project.id });

    expect(await archiveIssueAction(ours.id)).toEqual({});
    expect(await archivedAt(ours.id)).toBeInstanceOf(Date);
    expect(refresh).toHaveBeenCalled();
  });

  it("refuses an issue of another organization", async () => {
    const theirs = await createIssue();

    expect(await archiveIssueAction(theirs.id)).toEqual({
      error: "Issue not found.",
    });
    expect(await archivedAt(theirs.id)).toBeNull();
  });

  it("archives an issue only once", async () => {
    const project = await createProject({ organizationId });
    const ours = await createIssue({ projectId: project.id });
    await archiveIssueAction(ours.id);
    const first = await archivedAt(ours.id);

    expect(await archiveIssueAction(ours.id)).toEqual({
      error: "Issue not found.",
    });
    expect(await archivedAt(ours.id)).toEqual(first);
  });
});

// A viewer may look, never change. Every issue here is in our own
// organization, so the role is the only reason to say no.
describe("what a viewer can't do", () => {
  beforeEach(() => signedInAs("viewer"));

  it("refuses to archive an issue", async () => {
    const project = await createProject({ organizationId });
    const ours = await createIssue({ projectId: project.id });

    await expect(archiveIssueAction(ours.id)).rejects.toThrow(
      "A viewer can't archive issues.",
    );
    expect(await archivedAt(ours.id)).toBeNull();
  });

  it("refuses to create an issue", async () => {
    const project = await createProject({ organizationId });

    await expect(
      createIssueAction(
        project.id,
        {},
        form({ title: "Fix the logo", description: "" }),
      ),
    ).rejects.toThrow("A viewer can't create issues.");
    expect(await titlesIn(project.id)).toEqual([]);
  });

  it("refuses to edit an issue", async () => {
    const project = await createProject({ organizationId });
    const ours = await createIssue({
      projectId: project.id,
      title: "Fix the logo",
    });

    await expect(
      updateIssueAction(
        ours.id,
        {},
        form({ title: "Something else", description: "" }),
      ),
    ).rejects.toThrow("A viewer can't update issues.");
    expect(await titlesIn(project.id)).toEqual(["Fix the logo"]);
  });
});

describe("what a member can't do", () => {
  it("refuses to archive an issue", async () => {
    signedInAs("member");
    const project = await createProject({ organizationId });
    const ours = await createIssue({ projectId: project.id });

    await expect(archiveIssueAction(ours.id)).rejects.toThrow(
      "A member can't archive issues.",
    );
    expect(await archivedAt(ours.id)).toBeNull();
  });
});
