import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewIssueForm } from "@/components/issue-form";
import { Modal } from "@/components/modal";
import { getProject } from "@/lib/data";

export const metadata: Metadata = { title: "New issue" };

// Opened from the project page, /issues/new shows up here, over the list.
export default async function NewIssueModal({
  params,
}: PageProps<"/projects/[projectId]/issues/new">) {
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) {
    notFound();
  }

  return (
    <Modal title="New issue" description={`In ${project.name}`}>
      <NewIssueForm projectId={project.id} />
    </Modal>
  );
}
