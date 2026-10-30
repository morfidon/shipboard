export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1">
      <aside className="w-56 border-r border-zinc-200 p-4 dark:border-zinc-800">
        <p className="mb-6 text-lg font-bold">Shipboard</p>
        <nav className="flex flex-col gap-2">
          <a href="/dashboard">Dashboard</a>
          <a href="/projects">Projects</a>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
