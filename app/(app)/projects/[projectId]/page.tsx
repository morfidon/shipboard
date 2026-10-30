import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IssueListSkeleton } from "@/components/issue-list";
import { ProjectIssues } from "@/components/project-issues";
import { getProject } from "@/lib/data";

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{project.name}</h1>
      <p className="mt-2 text-muted-foreground">{project.description}</p>
      <div className="mt-6">
        <Suspense fallback={<IssueListSkeleton />}>
          <ProjectIssues projectId={project.id} />
        </Suspense>
      </div>
    </div>
  );
}
