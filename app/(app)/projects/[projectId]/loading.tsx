import { IssueListSkeleton } from "@/components/issue-list";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-3 h-5 w-96" />
      <div className="mt-6">
        <IssueListSkeleton />
      </div>
    </div>
  );
}
