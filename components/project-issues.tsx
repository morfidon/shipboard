import { IssueList } from "@/components/issue-list";
import { getIssues } from "@/lib/data";

export async function ProjectIssues({ projectId }: { projectId: string }) {
  const { items, total } = await getIssues(projectId);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "issue" : "issues"}
      </p>
      <IssueList issues={items} />
    </div>
  );
}
