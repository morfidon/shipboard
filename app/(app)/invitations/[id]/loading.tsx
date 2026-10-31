import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex max-w-md flex-col gap-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-5 w-80" />
    </div>
  );
}
