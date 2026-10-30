import "server-only";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
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

export async function getProject(id: string): Promise<Project | undefined> {
  const [row] = await db
    .select({
      id: project.id,
      name: project.name,
      description: project.description,
    })
    .from(project)
    .where(eq(project.id, id));
  return row;
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
