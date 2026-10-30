import { Collapsible } from "@/components/collapsible";
import { IssueList } from "@/components/issue-list";
import { getIssues } from "@/lib/data";

export async function ProjectIssues({ projectId }: { projectId: string }) {
  const issues = await getIssues(projectId);
  const openIssues = issues.filter((issue) => issue.status !== "done");
  const doneIssues = issues.filter((issue) => issue.status === "done");

  return (
    <div className="flex flex-col gap-6">
      <IssueList issues={openIssues} />
      <Collapsible title={`Done (${doneIssues.length})`}>
        <IssueList issues={doneIssues} />
      </Collapsible>
    </div>
  );
}
