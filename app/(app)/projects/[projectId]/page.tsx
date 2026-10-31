import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IssueListSkeleton } from "@/components/issue-list";
import { ProjectIssues } from "@/components/project-issues";
import { buttonVariants } from "@/components/ui/button";
import { getProject } from "@/lib/data";
import { parseIssueSearch } from "@/lib/issue-filters";

export default async function ProjectPage({
  params,
  searchParams,
}: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const search = parseIssueSearch(await searchParams);
  const project = await getProject(projectId);

  if (!project) {
    notFound();
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="mt-2 text-muted-foreground">{project.description}</p>
        </div>
        <Link
          href={`/projects/${project.id}/issues/new`}
          className={buttonVariants()}
        >
          New issue
        </Link>
      </div>
      <div className="mt-6">
        <Suspense fallback={<IssueListSkeleton />}>
          <ProjectIssues projectId={project.id} search={search} />
        </Suspense>
      </div>
    </div>
  );
}
