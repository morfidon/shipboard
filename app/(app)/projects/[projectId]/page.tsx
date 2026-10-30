import { notFound } from "next/navigation";
import { Collapsible } from "@/components/collapsible";
import { IssueList } from "@/components/issue-list";
import { getIssues, getProject } from "@/lib/data";

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) {
    notFound();
  }

  const issues = await getIssues(project.id);
  const openIssues = issues.filter((issue) => issue.status !== "done");
  const doneIssues = issues.filter((issue) => issue.status === "done");

  return (
    <div>
      <h1 className="text-2xl font-bold">{project.name}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        {project.description}
      </p>
      <div className="mt-6 flex flex-col gap-6">
        <IssueList issues={openIssues} />
        <Collapsible title={`Done (${doneIssues.length})`}>
          <IssueList issues={doneIssues} />
        </Collapsible>
      </div>
    </div>
  );
}
