import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewIssueForm } from "@/components/issue-form";
import { getProject } from "@/lib/data";

export const metadata: Metadata = { title: "New issue" };

export default async function NewIssuePage({
  params,
}: PageProps<"/projects/[projectId]/issues/new">) {
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold">New issue</h1>
      <p className="mt-2 text-muted-foreground">In {project.name}</p>
      <div className="mt-6">
        <NewIssueForm projectId={project.id} />
      </div>
    </div>
  );
}
