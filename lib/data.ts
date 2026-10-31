import "server-only";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import {
  issue,
  issueStatus,
  member,
  organization,
  project,
  user,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";

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

// The name of the team the person works in right now.
export async function getTeamName(): Promise<string> {
  const { organizationId } = await getCurrentUser();

  const [row] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, organizationId));
  return row.name;
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

// Writes get the organization of the person asking. Anything that belongs
// to another organization is treated as if it didn't exist.

export async function createIssue(
  values: { projectId: string; title: string; description: string },
  organizationId: string,
): Promise<{ id: string } | undefined> {
  const [owned] = await db
    .select({ id: project.id })
    .from(project)
    .where(
      and(
        eq(project.id, values.projectId),
        eq(project.organizationId, organizationId),
      ),
    );
  if (!owned) {
    return undefined;
  }

  const [row] = await db
    .insert(issue)
    .values(values)
    .returning({ id: issue.id });
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
  organizationId: string,
): Promise<boolean> {
  const changed = await db
    .update(issue)
    .set({ status })
    .where(ownIssue(issueId, organizationId))
    .returning({ id: issue.id });
  return changed.length > 0;
}

export async function updateIssue(
  issueId: string,
  values: { title: string; description: string },
  organizationId: string,
): Promise<{ projectId: string } | undefined> {
  const [row] = await db
    .update(issue)
    .set(values)
    .where(ownIssue(issueId, organizationId))
    .returning({ projectId: issue.projectId });
  return row;
}

export async function archiveIssue(
  issueId: string,
  organizationId: string,
): Promise<boolean> {
  const archived = await db
    .update(issue)
    .set({ archivedAt: new Date() })
    .where(ownIssue(issueId, organizationId))
    .returning({ id: issue.id });
  return archived.length > 0;
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
  organizationId: string,
): Promise<IssueDetails | undefined> {
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
