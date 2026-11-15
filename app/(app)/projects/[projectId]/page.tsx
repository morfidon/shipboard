import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IssueListSkeleton } from "@/components/issue-list";
import { ProjectIssues } from "@/components/project-issues";
import { buttonVariants } from "@/components/ui/button";
import { getIssuePermissions, getProject } from "@/lib/data";
import { parseIssueSearch } from "@/lib/issue-filters";

// The tab shows the project's name. getProject is wrapped in React's cache,
// so this and the page below share one query.
export async function generateMetadata({
  params,
}: PageProps<"/projects/[projectId]">): Promise<Metadata> {
  const { projectId } = await params;
  const project = await getProject(projectId);
  return { title: project?.name ?? "Project not found" };
}

export default async function ProjectPage({
  params,
  searchParams,
}: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const search = parseIssueSearch(await searchParams);
  const [project, can] = await Promise.all([
    getProject(projectId),
    getIssuePermissions(),
  ]);

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
        {can.create && (
          <Link
            href={`/projects/${project.id}/issues/new`}
            className={buttonVariants()}
          >
            New issue
          </Link>
        )}
      </div>
      <div className="mt-6">
        <Suspense fallback={<IssueListSkeleton />}>
          <ProjectIssues projectId={project.id} search={search} />
        </Suspense>
      </div>
    </div>
  );
}
