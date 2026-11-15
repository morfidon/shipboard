import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NewProjectForm } from "@/components/new-project-form";
import { StarButton } from "@/components/star-button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getProjectPermissions, getProjects } from "@/lib/data";

export const metadata: Metadata = { title: "Projects" };

// Not async: the heading needs no data, so it goes into the static shell.
// Only the list waits for the database, behind its own placeholder.
export default function ProjectsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Projects</h1>
      <Suspense fallback={<ProjectListSkeleton />}>
        <ProjectList />
      </Suspense>
      <Suspense>
        <NewProject />
      </Suspense>
    </div>
  );
}

async function ProjectList() {
  const projects = await getProjects();

  return (
    <>
      {projects.length === 0 && (
        <p className="mt-2 text-muted-foreground">No projects yet.</p>
      )}
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
    </>
  );
}

// Only for people who may start a project.
async function NewProject() {
  const can = await getProjectPermissions();
  if (!can.create) {
    return null;
  }

  return (
    <section className="mt-10 flex flex-col gap-4">
      <h2 className="text-lg font-semibold">New project</h2>
      <NewProjectForm />
    </section>
  );
}

function ProjectListSkeleton() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  );
}
