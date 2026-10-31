import { notFound } from "next/navigation";
import { EditIssueForm } from "@/components/issue-form";
import { getIssue, getIssuePermissions } from "@/lib/data";

export default async function IssuePage({
  params,
}: PageProps<"/projects/[projectId]/issues/[issueId]">) {
  const { projectId, issueId } = await params;
  const [issue, can] = await Promise.all([
    getIssue(issueId),
    getIssuePermissions(),
  ]);

  // The issue must also belong to the project in the address, and this
  // page is only for people who may change it.
  if (!issue || issue.projectId !== projectId || !can.update) {
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
