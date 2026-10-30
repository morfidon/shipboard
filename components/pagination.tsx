import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function Pagination({
  page,
  pageCount,
}: {
  page: number;
  pageCount: number;
}) {
  const link = buttonVariants({ variant: "outline", size: "sm" });

  return (
    <nav aria-label="Pages" className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        Page {page} of {pageCount}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={`?page=${page - 1}`} className={link}>
            Previous
          </Link>
        )}
        {page < pageCount && (
          <Link href={`?page=${page + 1}`} className={link}>
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}
