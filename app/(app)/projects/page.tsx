import Link from "next/link";
import { StarButton } from "@/components/star-button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProjects } from "@/lib/data";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div>
      <h1 className="text-2xl font-bold">Projects</h1>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <li key={project.id}>
            <Card>
              <CardHeader>
                <CardTitle>
                  <Link
                    href={`/projects/${project.id}`}
                    className="hover:underline"
                  >
                    {project.name}
                  </Link>
                </CardTitle>
                <CardDescription>{project.description}</CardDescription>
                <CardAction>
                  <StarButton projectId={project.id} />
                </CardAction>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
