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

// The real cache lives only in a real Next.js server, so these tests talk
// to one over HTTP, like a browser.
beforeAll(startServer);
afterAll(stopServer);

describe("the dashboard numbers", () => {
  it("come from the saved copy", async () => {
    const { organizationId, cookie } = await signedInOwner();
    const project = await createProject({ organizationId });
    const fix = await createIssue({ projectId: project.id });
    const dashboard = () => numbersOn(cookie, "/dashboard");
    expect(await dashboard()).toEqual({ todo: 1, inProgress: 0, done: 0 });

    // A change behind the app's back: nothing throws the copy away.
    await db.update(issue).set({ status: "done" }).where(eq(issue.id, fix.id));

    expect(await dashboard()).toEqual({ todo: 1, inProgress: 0, done: 0 });
  });

  it("are new right after a status change", async () => {
    const { organizationId, cookie } = await signedInOwner();
    const project = await createProject({ organizationId });
    const fix = await createIssue({ projectId: project.id });
    const dashboard = () => numbersOn(cookie, "/dashboard");
    expect(await dashboard()).toEqual({ todo: 1, inProgress: 0, done: 0 });

    await callAction(cookie, "updateIssueStatusAction", [fix.id, "done"]);

    expect(await dashboard()).toEqual({ todo: 0, inProgress: 0, done: 1 });
  });
});
