"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
        active ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </Link>
  );
}
