import type { Issue } from "@/lib/data";

const statusLabels = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export function IssueList({ issues }: { issues: Issue[] }) {
  return (
    <ul className="flex flex-col gap-2">
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
  );
}
