import { notFound } from "next/navigation";
import { EditIssueForm } from "@/components/issue-form";
import { getCurrentUser } from "@/lib/current-user";
import { getIssue } from "@/lib/data";

export default async function IssuePage({
  params,
}: PageProps<"/projects/[projectId]/issues/[issueId]">) {
  const { projectId, issueId } = await params;
  const user = await getCurrentUser();
  const issue = await getIssue(issueId, user.organizationId);

  // The issue must also belong to the project in the address.
  if (!issue || issue.projectId !== projectId) {
    notFound();
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold">Edit issue</h1>
      <div className="mt-6">
        <EditIssueForm issue={issue} />
      </div>
    </div>
  );
}
