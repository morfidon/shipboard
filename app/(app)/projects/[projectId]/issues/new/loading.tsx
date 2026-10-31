import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-9" />
      <Skeleton className="h-24" />
    </div>
  );
}
