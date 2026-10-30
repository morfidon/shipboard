import Link from "next/link";

export default function NotFound() {
  return (
    <div>
      <h2 className="text-xl font-bold">Project not found</h2>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        This project does not exist, or it was deleted.
      </p>
      <Link href="/projects" className="mt-4 inline-block underline">
        Back to all projects
      </Link>
    </div>
  );
}
