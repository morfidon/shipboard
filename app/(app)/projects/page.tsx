import Link from "next/link";
import { StarButton } from "@/components/star-button";
import { getProjects } from "@/lib/data";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div>
      <h1 className="text-2xl font-bold">Projects</h1>
      <ul className="mt-4 flex flex-col gap-2">
        {projects.map((project) => (
          <li key={project.id} className="flex items-center gap-4">
            <Link href={`/projects/${project.id}`} className="hover:underline">
              {project.name}
            </Link>
            <StarButton />
          </li>
        ))}
      </ul>
    </div>
  );
}
