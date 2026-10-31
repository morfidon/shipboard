import "server-only";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { issue, issueStatus, project, user } from "@/db/schema";

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

export async function getProjects(): Promise<Project[]> {
  return db
    .select({
      id: project.id,
      name: project.name,
      description: project.description,
    })
    .from(project)
    .orderBy(project.name);
}

// Project ids are UUIDs. Anything else can't be a project, so we don't ask the database.
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// cache: if two components ask for the same project in one request,
// the database is asked only once.
export const getProject = cache(
  async (id: string): Promise<Project | undefined> => {
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
      .where(eq(project.id, id));
    return row;
  },
);

export async function getUsers(): Promise<Person[]> {
  return db
    .select({ id: user.id, name: user.name })
    .from(user)
    .orderBy(user.name);
}

export async function getIssues(
  projectId: string,
  { statuses, assigneeId, page = 1 }: IssueFilters = {},
): Promise<{ items: Issue[]; total: number }> {
  const where = and(
    eq(issue.projectId, projectId),
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

  return { items, total };
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

export async function updateIssueStatus(
  issueId: string,
  status: IssueStatus,
  organizationId: string,
): Promise<boolean> {
  const changed = await db
    .update(issue)
    .set({ status })
    .where(
      and(
        eq(issue.id, issueId),
        // Only an issue in one of this organization's projects.
        inArray(
          issue.projectId,
          db
            .select({ id: project.id })
            .from(project)
            .where(eq(project.organizationId, organizationId)),
        ),
      ),
    )
    .returning({ id: issue.id });
  return changed.length > 0;
}
