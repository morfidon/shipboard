import Link from "next/link";
import { IssueStatusMenu } from "@/components/issue-status-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { Issue } from "@/lib/data";

export function IssueList({
  projectId,
  issues,
}: {
  projectId: string;
  issues: Issue[];
}) {
  return (
    <ul className="flex flex-col gap-2">
      {issues.map((issue) => (
        <li
          key={issue.id}
          className="flex items-center justify-between gap-4 rounded-lg border p-3"
        >
          <div className="flex flex-col">
            <Link
              href={`/projects/${projectId}/issues/${issue.id}`}
              className="hover:underline"
            >
              {issue.title}
            </Link>
            <span className="text-sm text-muted-foreground">
              {issue.assignee ?? "Unassigned"}
            </span>
          </div>
          <IssueStatusMenu issueId={issue.id} status={issue.status} />
        </li>
      ))}
    </ul>
  );
}

export function IssueListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
    </div>
  );
}
