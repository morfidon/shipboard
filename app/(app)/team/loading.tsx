import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-64" />
    </div>
  );
}
