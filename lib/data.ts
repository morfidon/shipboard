import "server-only";
import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  sql,
  type SQL,
} from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { db } from "@/db";
import {
  attachment,
  invitation,
  issue,
  issueStatus,
  member,
  organization,
  project,
  user,
} from "@/db/schema";
import { getCurrentUser, type CurrentUser } from "@/lib/current-user";
import {
  can,
  canCreateProjects,
  canManageBilling,
  type IssueAction,
} from "@/lib/permissions";
import type { Plan } from "@/lib/plans";
import { deleteFile, downloadUrl, storedFile, uploadUrl } from "@/lib/storage";

export type IssueStatus = (typeof issueStatus.enumValues)[number];

export type Project = {
  id: string;
  name: string;
  description: string;
};

export type Issue = {
  id: string;
  title: string;
  status: IssueStatus;
  assignee: string | null;
};

export type Person = {
  id: string;
  name: string;
};

export type IssueFilters = {
  statuses?: IssueStatus[];
  assigneeId?: string;
  page?: number;
  // The column that puts the issues in order: newest first by default.
  orderBy?: AnyPgColumn;
};

export const PAGE_SIZE = 10;

// Every read starts with getCurrentUser(): it checks the session for real,
// and sends anyone without one to the sign-in page. Then it reads only
// what belongs to their team.

// The ids of one organization's projects, as a subquery.
function projectsOf(organizationId: string) {
  return db
    .select({ id: project.id })
    .from(project)
    .where(eq(project.organizationId, organizationId));
}

export async function getProjects(): Promise<Project[]> {
  const { organizationId } = await getCurrentUser();

  return db
    .select({
      id: project.id,
      name: project.name,
      description: project.description,
    })
    .from(project)
    .where(eq(project.organizationId, organizationId))
    .orderBy(project.name);
}

export type ProjectStats = {
  id: string;
  name: string;
  todo: number;
  inProgress: number;
  done: number;
};

// Counts the rows that match, inside one group.
function countWhere(condition: SQL) {
  return sql<number>`count(*) filter (where ${condition})`.mapWith(Number);
}

// Every project of the team, with its issues counted by status.
// Archived issues don't count. A project with no issues shows zeros.
export async function getProjectStats(): Promise<ProjectStats[]> {
  // The session is different in every request, so we read it outside the
  // cache, and pass in only the team's id. Each team gets its own copy.
  const { organizationId } = await getCurrentUser();
  return projectStatsFor(organizationId);
}

async function projectStatsFor(
  organizationId: string,
): Promise<ProjectStats[]> {
  "use cache";
  // Fresh for an hour. After that, the next visit still gets this copy
  // while a new one is made in the background.
  cacheLife("hours");

  // One label for the team's list of projects, so a new project throws the
  // copy away too.
  cacheTag(teamTag(organizationId));
  const rows = await statsOf(eq(project.organizationId, organizationId));

  // One label for every project in this copy, so a change in any of them
  // throws the copy away. One cacheTag call takes at most 128 labels, and a
  // team can have more projects, so each label gets its own call.
  rows.forEach((row) => cacheTag(projectTag(row.id)));
  return rows;
}

// One project's numbers, for the card on its own page.
export async function getStatsForProject(
  projectId: string,
): Promise<ProjectStats | undefined> {
  const { organizationId } = await getCurrentUser();

  if (!uuidPattern.test(projectId)) {
    return undefined;
  }
  return statsForProject(projectId, organizationId);
}

async function statsForProject(projectId: string, organizationId: string) {
  "use cache";
  cacheLife("hours");
  // The same label as the dashboard's copy, so every action that changes
  // this project already throws this copy away too.
  cacheTag(projectTag(projectId));

  const [row] = await statsOf(
    and(eq(project.id, projectId), eq(project.organizationId, organizationId)),
  );
  return row;
}

// The projects that match, each with its issues counted by status.
function statsOf(where: SQL | undefined) {
  return db
    .select({
      id: project.id,
      name: project.name,
      todo: countWhere(eq(issue.status, "todo")),
      inProgress: countWhere(eq(issue.status, "in_progress")),
      done: countWhere(eq(issue.status, "done")),
    })
    .from(project)
    .leftJoin(
      issue,
      and(eq(issue.projectId, project.id), isNull(issue.archivedAt)),
    )
    .where(where)
    .groupBy(project.id)
    .orderBy(project.name);
}

// The label on the saved copy of a team's list of projects.
export function teamTag(organizationId: string) {
  return `team-${organizationId}`;
}

// The label on every saved copy that holds a project's numbers.
export function projectTag(projectId: string) {
  return `project-${projectId}`;
}

// Project ids are UUIDs. Anything else can't be a project, so we don't ask the database.
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// cache: if two components ask for the same project in one request,
// the database is asked only once.
export const getProject = cache(
  async (id: string): Promise<Project | undefined> => {
    const { organizationId } = await getCurrentUser();

    if (!uuidPattern.test(id)) {
      return undefined;
    }

    const [row] = await db
      .select({
        id: project.id,
        name: project.name,
        description: project.description,
      })
      .from(project)
      .where(
        and(eq(project.id, id), eq(project.organizationId, organizationId)),
      );
    return row;
  },
);

// May this person start a new project? The page shows the form only then.
export async function getProjectPermissions(): Promise<{ create: boolean }> {
  const { role } = await getCurrentUser();
  return { create: canCreateProjects(role) };
}

// A new project in the person's team, for a role that may create one.
export async function createProject(values: {
  name: string;
  description: string;
}): Promise<{ id: string; organizationId: string }> {
  const user = await getCurrentUser();
  if (!canCreateProjects(user.role)) {
    throw new Error(`A ${user.role} can't create projects.`);
  }

  const [row] = await db
    .insert(project)
    .values({ ...values, organizationId: user.organizationId })
    .returning({ id: project.id, organizationId: project.organizationId });
  return row;
}

// What the person's role lets them do with issues, so the screen shows only
// buttons that work. Hiding a button protects nothing: the writes check again.
export async function getIssuePermissions(): Promise<
  Record<IssueAction, boolean>
> {
  const { role } = await getCurrentUser();

  return {
    create: can(role, "create"),
    update: can(role, "update"),
    archive: can(role, "archive"),
  };
}

// The name of the team the person works in right now.
export async function getTeamName(): Promise<string> {
  const { organizationId } = await getCurrentUser();

  const [row] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, organizationId));
  return row.name;
}

export type Billing = {
  plan: Plan;
  status: string | null;
  customerId: string | null;
  canManage: boolean;
};

// The team's plan, and whether this person may change it.
export async function getBilling(): Promise<Billing> {
  const { organizationId, role } = await getCurrentUser();

  const [row] = await db
    .select({
      plan: organization.plan,
      status: organization.planStatus,
      customerId: organization.stripeCustomerId,
    })
    .from(organization)
    .where(eq(organization.id, organizationId));
  return { ...row, canManage: canManageBilling(role) };
}

export type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
};

// The team's members with their roles, for the Team page.
export async function getMembers(): Promise<Member[]> {
  const { organizationId } = await getCurrentUser();

  return db
    .select({
      id: member.id,
      name: user.name,
      email: user.email,
      role: member.role,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, organizationId))
    .orderBy(member.createdAt, user.name);
}

export type PendingInvitation = {
  id: string;
  email: string;
  role: string | null;
};

// Invitations nobody has accepted yet, and that haven't expired.
export async function getPendingInvitations(): Promise<PendingInvitation[]> {
  const { organizationId } = await getCurrentUser();

  return db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
    })
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, organizationId),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date()),
      ),
    )
    .orderBy(invitation.createdAt);
}

// The people in the team: they're the ones an issue can be assigned to.
export async function getUsers(): Promise<Person[]> {
  const { organizationId } = await getCurrentUser();

  return db
    .select({ id: user.id, name: user.name })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, organizationId))
    .orderBy(user.name);
}

export async function getIssues(
  projectId: string,
  {
    statuses,
    assigneeId,
    page = 1,
    orderBy = issue.createdAt,
  }: IssueFilters = {},
): Promise<{ items: Issue[]; total: number; page: number }> {
  const { organizationId } = await getCurrentUser();

  const where = and(
    eq(issue.projectId, projectId),
    inArray(issue.projectId, projectsOf(organizationId)),
    isNull(issue.archivedAt),
    statuses ? inArray(issue.status, statuses) : undefined,
    assigneeId ? eq(issue.assigneeId, assigneeId) : undefined,
  );

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: issue.id,
        title: issue.title,
        status: issue.status,
        assignee: user.name,
      })
      .from(issue)
      .leftJoin(user, eq(issue.assigneeId, user.id))
      .where(where)
      // The latest first. The id breaks ties, so the order is always the same.
      .orderBy(desc(orderBy), desc(issue.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(issue).where(where),
  ]);

  // A page past the end (its last issue was archived, or a link says
  // ?page=999): ask again, for the last page.
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > lastPage) {
    return getIssues(projectId, {
      statuses,
      assigneeId,
      page: lastPage,
      orderBy,
    });
  }

  return { items, total, page };
}

// Writes ask who is asking, check that their role may do it, and touch
// only their team's rows. Anything from another team is treated as if it
// didn't exist.

// A role that may not do this is refused here, whatever the screen shows.
function allow(user: CurrentUser, action: IssueAction) {
  if (!can(user.role, action)) {
    throw new Error(`A ${user.role} can't ${action} issues.`);
  }
}

export async function createIssue(values: {
  projectId: string;
  title: string;
  description: string;
}): Promise<{ id: string; projectId: string } | undefined> {
  const user = await getCurrentUser();
  allow(user, "create");

  const [owned] = await db
    .select({ id: project.id })
    .from(project)
    .where(
      and(
        eq(project.id, values.projectId),
        eq(project.organizationId, user.organizationId),
      ),
    );
  if (!owned) {
    return undefined;
  }

  // The project's id comes back the way the database stores it. Postgres
  // also accepts other spellings, like capital letters; a label doesn't.
  const [row] = await db
    .insert(issue)
    .values(values)
    .returning({ id: issue.id, projectId: issue.projectId });
  return row;
}

// The condition every issue write uses: this issue, not archived, and only
// if it's in one of this organization's projects.
function ownIssue(issueId: string, organizationId: string) {
  return and(
    eq(issue.id, issueId),
    isNull(issue.archivedAt),
    inArray(issue.projectId, projectsOf(organizationId)),
  );
}

export async function updateIssueStatus(
  issueId: string,
  status: IssueStatus,
): Promise<{ projectId: string } | undefined> {
  const user = await getCurrentUser();
  allow(user, "update");

  const [row] = await db
    .update(issue)
    .set({ status })
    .where(ownIssue(issueId, user.organizationId))
    .returning({ projectId: issue.projectId });
  return row;
}

export async function updateIssue(
  issueId: string,
  values: { title: string; description: string },
): Promise<{ projectId: string } | undefined> {
  const user = await getCurrentUser();
  allow(user, "update");

  const [row] = await db
    .update(issue)
    .set(values)
    .where(ownIssue(issueId, user.organizationId))
    .returning({ projectId: issue.projectId });
  return row;
}

export async function archiveIssue(
  issueId: string,
): Promise<{ projectId: string } | undefined> {
  const user = await getCurrentUser();
  allow(user, "archive");

  const [row] = await db
    .update(issue)
    .set({ archivedAt: new Date() })
    .where(ownIssue(issueId, user.organizationId))
    .returning({ projectId: issue.projectId });
  return row;
}

export type IssueDetails = {
  id: string;
  projectId: string;
  title: string;
  description: string;
};

// One issue for the edit page. Reading it is the first step of a write,
// so it gets the same check.
export async function getIssue(
  issueId: string,
): Promise<IssueDetails | undefined> {
  const { organizationId } = await getCurrentUser();

  if (!uuidPattern.test(issueId)) {
    return undefined;
  }

  const [row] = await db
    .select({
      id: issue.id,
      projectId: issue.projectId,
      title: issue.title,
      description: issue.description,
    })
    .from(issue)
    .where(ownIssue(issueId, organizationId));
  return row;
}

// Attachments: only Pro teams, only people who may change the issue, only
// their team's issues. The file itself goes straight from the browser to
// storage; the server signs the way in and checks what arrived.

export type AttachmentView = {
  id: string;
  fileName: string;
  size: number;
};

// The files on one issue, each with a download link for five minutes.
export async function getAttachments(
  issueId: string,
): Promise<AttachmentView[]> {
  const { organizationId } = await getCurrentUser();

  if (!uuidPattern.test(issueId)) {
    return [];
  }

  const rows = await db
    .select({
      id: attachment.id,
      fileName: attachment.fileName,
      size: attachment.size,
    })
    .from(attachment)
    .innerJoin(issue, eq(attachment.issueId, issue.id))
    .where(
      and(
        eq(attachment.issueId, issueId),
        inArray(issue.projectId, projectsOf(organizationId)),
      ),
    )
    .orderBy(attachment.createdAt);
  return rows;
}

// A fresh download link for one of this team's attachments, or null. It's
// made when someone clicks, so it never comes from an old page.
export async function attachmentDownloadUrl(attachmentId: string) {
  const { organizationId } = await getCurrentUser();

  if (!uuidPattern.test(attachmentId)) {
    return null;
  }
  const [row] = await db
    .select({ key: attachment.storageKey, fileName: attachment.fileName })
    .from(attachment)
    .innerJoin(issue, eq(attachment.issueId, issue.id))
    .where(
      and(
        eq(attachment.id, attachmentId),
        inArray(issue.projectId, projectsOf(organizationId)),
      ),
    );
  return row ? downloadUrl(row.key, row.fileName) : null;
}

type UploadCheck = { error: string } | { ok: true };

// Pro, may change issues, and the issue is theirs.
async function mayAttach(
  user: CurrentUser,
  issueId: string,
): Promise<UploadCheck> {
  allow(user, "update");

  const [team] = await db
    .select({ plan: organization.plan })
    .from(organization)
    .where(eq(organization.id, user.organizationId));
  if (team?.plan !== "pro") {
    return { error: "Attachments are a Pro feature." };
  }

  if (!uuidPattern.test(issueId)) {
    return { error: "Issue not found." };
  }
  const [found] = await db
    .select({ id: issue.id })
    .from(issue)
    .where(ownIssue(issueId, user.organizationId));
  return found ? { ok: true } : { error: "Issue not found." };
}

// Step 1: check everything, then sign a delivery note for this one file.
// Nothing is saved yet.
export async function prepareUpload(
  issueId: string,
  file: { size: number; contentType: string },
): Promise<{ error: string } | { key: string; url: string }> {
  const user = await getCurrentUser();
  const check = await mayAttach(user, issueId);
  if ("error" in check) {
    return check;
  }

  // A key of our own: the team, the issue, and a random part. The file's
  // name stays in our database.
  const key = `${user.organizationId}/${issueId}/${crypto.randomUUID()}`;
  return { key, url: await uploadUrl(key, file.contentType, file.size) };
}

// Step 2: the browser says the file arrived. We ask storage ourselves, and
// save the attachment only if the stored size and type are the ones signed.
export async function saveAttachment(
  issueId: string,
  key: string,
  file: { fileName: string; contentType: string; size: number },
): Promise<{ error: string } | { id: string }> {
  const user = await getCurrentUser();
  const check = await mayAttach(user, issueId);
  if ("error" in check) {
    return check;
  }
  // Only a key we could have signed for this issue.
  if (!key.startsWith(`${user.organizationId}/${issueId}/`)) {
    return { error: "Issue not found." };
  }

  // Saved before? A repeated request gets the same attachment back, and an
  // attached file is never deleted.
  const [saved] = await db
    .select({ id: attachment.id })
    .from(attachment)
    .where(eq(attachment.storageKey, key));
  if (saved) {
    return saved;
  }

  const stored = await storedFile(key);
  if (!stored) {
    return { error: "The file didn't arrive. Try again." };
  }
  // Another size or type than the one signed: the file goes.
  if (stored.size !== file.size || stored.contentType !== file.contentType) {
    await deleteFile(key);
    return { error: "The stored file doesn't match. Try again." };
  }

  const [row] = await db
    .insert(attachment)
    .values({
      issueId,
      storageKey: key,
      fileName: file.fileName,
      size: stored.size,
      contentType: file.contentType,
      uploadedBy: user.id,
    })
    .onConflictDoNothing()
    .returning({ id: attachment.id });
  return row ?? { error: "This file is attached already." };
}
