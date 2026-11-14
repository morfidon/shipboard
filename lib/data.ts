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
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { db } from "@/db";
import {
  invitation,
  issue,
  issueStatus,
  member,
  organization,
  project,
  user,
} from "@/db/schema";
import { getCurrentUser, type CurrentUser } from "@/lib/current-user";
import { can, type IssueAction } from "@/lib/permissions";

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

  const rows = await db
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
    .where(eq(project.organizationId, organizationId))
    .groupBy(project.id)
    .orderBy(project.name);

  // One label for every project in this copy, so a change in any of them
  // throws the copy away. One cacheTag call takes at most 128 labels, and a
  // team can have more projects, so each label gets its own call.
  rows.forEach((row) => cacheTag(projectTag(row.id)));
  return rows;
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
  { statuses, assigneeId, page = 1 }: IssueFilters = {},
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
      // Newest first. The id breaks ties, so the order is always the same.
      .orderBy(desc(issue.createdAt), desc(issue.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(issue).where(where),
  ]);

  // A page past the end (its last issue was archived, or a link says
  // ?page=999): ask again, for the last page.
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > lastPage) {
    return getIssues(projectId, { statuses, assigneeId, page: lastPage });
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
