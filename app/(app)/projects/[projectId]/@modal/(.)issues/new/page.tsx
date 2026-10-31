import { notFound } from "next/navigation";
import { Modal } from "@/components/modal";
import { NewIssueForm } from "@/components/new-issue-form";
import { getProject } from "@/lib/data";

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
