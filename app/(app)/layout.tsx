import { FolderKanban, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { NavLink } from "@/components/nav-link";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1">
      <aside className="w-56 border-r bg-muted/40 p-4">
        <Link href="/" className="mb-6 block px-3 text-lg font-bold">
          Shipboard
        </Link>
        <nav className="flex flex-col gap-1">
          <Suspense fallback={<Skeleton className="h-20" />}>
            <NavLink href="/dashboard">
              <LayoutDashboard className="size-4" />
              Dashboard
            </NavLink>
            <NavLink href="/projects">
              <FolderKanban className="size-4" />
              Projects
            </NavLink>
          </Suspense>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
