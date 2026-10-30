import Link from "next/link";
import { IssueFilters } from "@/components/issue-filters";
import { IssueList } from "@/components/issue-list";
import { Pagination } from "@/components/pagination";
import { getIssues, getProject, getUsers, PAGE_SIZE } from "@/lib/data";
import {
  issuesHref,
  statusFilters,
  type IssueSearch,
} from "@/lib/issue-filters";

export async function ProjectIssues({
  projectId,
  search,
}: {
  projectId: string;
  search: IssueSearch;
}) {
  const [project, people, { items, total }] = await Promise.all([
    getProject(projectId),
    getUsers(),
    getIssues(projectId, {
      statuses: search.status ? statusFilters[search.status] : undefined,
      assigneeId: search.assignee,
      page: search.page,
    }),
  ]);
  const filtered = Boolean(search.status || search.assignee);

  return (
    <div className="flex flex-col gap-4">
      {/* A new key resets the form when Back or a link changes the URL. */}
      <IssueFilters
        key={`${search.status}-${search.assignee}`}
        search={search}
        people={people}
      />

      {total === 0 && filtered && (
        <p className="text-muted-foreground">
          No issues match these filters.{" "}
          <Link href={issuesHref(projectId, { page: 1 })} className="underline">
            Clear the filters
          </Link>
        </p>
      )}

      {total === 0 && !filtered && (
        <p className="text-muted-foreground">
          No issues in {project?.name} yet.
        </p>
      )}

      {total > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "issue" : "issues"}
          </p>
          <IssueList issues={items} />
          <Pagination
            page={search.page}
            pageCount={Math.ceil(total / PAGE_SIZE)}
            hrefFor={(page) => issuesHref(projectId, { ...search, page })}
          />
        </>
      )}
    </div>
  );
}
