import Link from "next/link";

export default function NotFound() {
  return (
    <div>
      <h2 className="text-xl font-bold">Issue not found</h2>
      <p className="mt-2 text-muted-foreground">
        This issue does not exist, or it was archived.
      </p>
      <Link href="/projects" className="mt-4 inline-block underline">
        Back to all projects
      </Link>
    </div>
  );
}
