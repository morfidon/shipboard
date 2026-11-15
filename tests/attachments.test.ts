import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { attachment, organization } from "@/db/schema";
import {
  recordUploadAction,
  requestUploadAction,
} from "@/lib/attachment-actions";
import { getCurrentUser } from "@/lib/current-user";
import { deleteFile, storedFile, uploadUrl } from "@/lib/storage";
import {
  createIssue,
  createOrganization,
  createProject,
  createUser,
} from "./factories";

// No storage server in these tests: lib/storage is replaced by functions
// that answer what each test needs, and remember how they were called.
vi.mock("@/lib/storage", () => ({
  uploadUrl: vi.fn(async () => "https://storage.test/upload"),
  downloadUrl: vi.fn(async () => "https://storage.test/download"),
  storedFile: vi.fn(),
  deleteFile: vi.fn(),
}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: vi.fn() }));

const photo = {
  fileName: "screenshot.png",
  size: 120_000,
  contentType: "image/png",
};
let organizationId: string;
let projectId: string;
let issueId: string;

beforeEach(async () => {
  vi.clearAllMocks();
  organizationId = (await createOrganization()).id;
  await db
    .update(organization)
    .set({ plan: "pro" })
    .where(eq(organization.id, organizationId));
  projectId = (await createProject({ organizationId })).id;
  issueId = (await createIssue({ projectId })).id;
  const person = await createUser();
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: person.id,
    name: person.name,
    organizationId,
    role: "member",
  });
});

async function ticketFor(issue: string) {
  const ticket = await requestUploadAction(issue, photo);
  if ("error" in ticket) {
    throw new Error(ticket.error);
  }
  return ticket;
}

describe("requestUploadAction", () => {
  it("signs a link for one file of a Pro team's issue", async () => {
    const ticket = await ticketFor(issueId);

    expect(ticket.key.startsWith(`${organizationId}/${issueId}/`)).toBe(true);
    expect(ticket.url).toBe("https://storage.test/upload");
    expect(uploadUrl).toHaveBeenCalledWith(ticket.key, "image/png", 120_000);
  });

  it("refuses a team on the Free plan", async () => {
    await db
      .update(organization)
      .set({ plan: "free" })
      .where(eq(organization.id, organizationId));

    expect(await requestUploadAction(issueId, photo)).toEqual({
      error: "Attachments are a Pro feature.",
    });
    expect(uploadUrl).not.toHaveBeenCalled();
  });

  it("refuses files over 10 MB, and other kinds of files", async () => {
    expect(
      await requestUploadAction(issueId, { ...photo, size: 11 * 1024 * 1024 }),
    ).toEqual({ error: "Files can be up to 10 MB." });
    expect(
      await requestUploadAction(issueId, {
        ...photo,
        contentType: "text/html",
      }),
    ).toEqual({ error: "That type of file isn't allowed." });
  });

  it("refuses another team's issue", async () => {
    const theirs = await createIssue();

    expect(await requestUploadAction(theirs.id, photo)).toEqual({
      error: "Issue not found.",
    });
  });

  it("refuses a viewer", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "priya",
      name: "Priya Nair",
      organizationId,
      role: "viewer",
    });

    await expect(requestUploadAction(issueId, photo)).rejects.toThrow(
      "A viewer can't update issues.",
    );
  });
});

describe("recordUploadAction", () => {
  it("saves the attachment when the stored file is the one signed", async () => {
    const ticket = await ticketFor(issueId);
    vi.mocked(storedFile).mockResolvedValue({
      size: 120_000,
      contentType: "image/png",
    });

    expect(await recordUploadAction(issueId, ticket.key, photo)).toEqual({});
    expect(
      await db
        .select({ fileName: attachment.fileName, size: attachment.size })
        .from(attachment),
    ).toEqual([{ fileName: "screenshot.png", size: 120_000 }]);
    expect(refresh).toHaveBeenCalled();
  });

  it.each([
    ["another size", { size: 119_872, contentType: "image/png" }],
    ["another type", { size: 120_000, contentType: "text/html" }],
  ])("refuses and deletes a stored file of %s", async (_, stored) => {
    const ticket = await ticketFor(issueId);
    vi.mocked(storedFile).mockResolvedValue(stored);

    expect(await recordUploadAction(issueId, ticket.key, photo)).toEqual({
      error: "The stored file doesn't match. Try again.",
    });
    expect(deleteFile).toHaveBeenCalledWith(ticket.key);
    expect(await db.select().from(attachment)).toEqual([]);
  });

  it("saves nothing when the file didn't arrive", async () => {
    const ticket = await ticketFor(issueId);
    vi.mocked(storedFile).mockResolvedValue(null);

    expect(await recordUploadAction(issueId, ticket.key, photo)).toEqual({
      error: "The file didn't arrive. Try again.",
    });
    expect(await db.select().from(attachment)).toEqual([]);
  });

  it("refuses a key signed for another issue", async () => {
    const other = await createIssue({ projectId });
    const ticket = await ticketFor(other.id);
    vi.mocked(storedFile).mockResolvedValue({
      size: 120_000,
      contentType: "image/png",
    });

    expect(await recordUploadAction(issueId, ticket.key, photo)).toEqual({
      error: "Issue not found.",
    });
  });
});

describe("a repeated save", () => {
  it("returns the same attachment, and never deletes its file", async () => {
    const ticket = await ticketFor(issueId);
    vi.mocked(storedFile).mockResolvedValue({
      size: 120_000,
      contentType: "image/png",
    });
    expect(await recordUploadAction(issueId, ticket.key, photo)).toEqual({});

    // The same key again, now with another size.
    const again = { ...photo, size: 5_000 };
    expect(await recordUploadAction(issueId, ticket.key, again)).toEqual({});
    expect(deleteFile).not.toHaveBeenCalled();
    expect(await db.select().from(attachment)).toHaveLength(1);
  });
});
