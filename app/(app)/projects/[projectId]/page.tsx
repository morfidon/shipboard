import { notFound } from "next/navigation";
import { getIssues, getProject } from "@/lib/data";

const statusLabels = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) {
    notFound();
  }

  const issues = await getIssues(project.id);

  return (
    <div>
      <h1 className="text-2xl font-bold">{project.name}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        {project.description}
      </p>
      <ul className="mt-6 flex flex-col gap-2">
        {issues.map((issue) => (
          <li
            key={issue.id}
            className="flex justify-between rounded border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <span>{issue.title}</span>
            <span className="text-sm text-zinc-500">
              {statusLabels[issue.status]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
