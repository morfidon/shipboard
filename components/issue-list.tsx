import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Issue } from "@/lib/data";

const statusLabels = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

const statusVariants = {
  todo: "outline",
  in_progress: "default",
  done: "secondary",
} as const;

export function IssueList({ issues }: { issues: Issue[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {issues.map((issue) => (
        <li
          key={issue.id}
          className="flex items-center justify-between gap-4 rounded-lg border p-3"
        >
          <div className="flex flex-col">
            <span>{issue.title}</span>
            <span className="text-sm text-muted-foreground">
              {issue.assignee ?? "Unassigned"}
            </span>
          </div>
          <Badge variant={statusVariants[issue.status]}>
            {statusLabels[issue.status]}
          </Badge>
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
