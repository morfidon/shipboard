import { IssueList } from "@/components/issue-list";
import { Pagination } from "@/components/pagination";
import { getIssues, getProject, PAGE_SIZE } from "@/lib/data";

export async function ProjectIssues({
  projectId,
  page,
}: {
  projectId: string;
  page: number;
}) {
  const [project, { items, total }] = await Promise.all([
    getProject(projectId),
    getIssues(projectId, { page }),
  ]);

  if (total === 0) {
    return (
      <p className="text-muted-foreground">No issues in {project?.name} yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "issue" : "issues"}
      </p>
      <IssueList issues={items} />
      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} />
    </div>
  );
}
