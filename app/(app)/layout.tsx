import { FolderKanban, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { NavLink } from "@/components/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { UserMenu } from "@/components/user-menu";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1">
      <aside className="flex w-56 flex-col border-r bg-muted/40 p-4">
        <Link href="/" className="mb-6 block px-3 text-lg font-bold">
          Shipboard
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
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
        <Suspense fallback={<Skeleton className="h-10" />}>
          <UserMenu />
        </Suspense>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
