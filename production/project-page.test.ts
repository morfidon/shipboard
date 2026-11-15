import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { issue } from "@/db/schema";
import { createIssue, createProject } from "../tests/factories";
import {
  callAction,
  numbersOn,
  signedInOwner,
  startServer,
  stopServer,
} from "./server";

beforeAll(startServer);
afterAll(stopServer);

describe("the project page's numbers", () => {
  it("come from the saved copy", async () => {
    const { organizationId, cookie } = await signedInOwner();
    const project = await createProject({ organizationId });
    const fix = await createIssue({ projectId: project.id });
    const card = () => numbersOn(cookie, `/projects/${project.id}`);
    expect(await card()).toEqual({ todo: 1, inProgress: 0, done: 0 });

    // A change behind the app's back: nothing throws the copy away.
    await db.update(issue).set({ status: "done" }).where(eq(issue.id, fix.id));

    expect(await card()).toEqual({ todo: 1, inProgress: 0, done: 0 });
  });

  it("are new right after a status change", async () => {
    const { organizationId, cookie } = await signedInOwner();
    const project = await createProject({ organizationId });
    const fix = await createIssue({ projectId: project.id });
    const card = () => numbersOn(cookie, `/projects/${project.id}`);
    expect(await card()).toEqual({ todo: 1, inProgress: 0, done: 0 });

    await callAction(cookie, "updateIssueStatusAction", [fix.id, "done"]);

    expect(await card()).toEqual({ todo: 0, inProgress: 0, done: 1 });
  });

  it("are new right after an issue is archived", async () => {
    const { organizationId, cookie } = await signedInOwner();
    const project = await createProject({ organizationId });
    const fix = await createIssue({ projectId: project.id });
    await createIssue({ projectId: project.id });
    const card = () => numbersOn(cookie, `/projects/${project.id}`);
    expect(await card()).toEqual({ todo: 2, inProgress: 0, done: 0 });

    await callAction(cookie, "archiveIssueAction", [fix.id]);

    expect(await card()).toEqual({ todo: 1, inProgress: 0, done: 0 });
  });
});
