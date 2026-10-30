import Link from "next/link";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1">
      <aside className="w-56 border-r bg-muted/40 p-4">
        <p className="mb-6 text-lg font-bold">Shipboard</p>
        <nav className="flex flex-col gap-2">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/projects">Projects</Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
