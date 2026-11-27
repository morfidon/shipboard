import type { IssueStatus } from "@/lib/data";

// What each choice in the Status filter means.
export const statusFilters = {
  open: ["todo", "in_progress"],
  todo: ["todo"],
  in_progress: ["in_progress"],
  done: ["done"],
} satisfies Record<string, IssueStatus[]>;

export type StatusFilter = keyof typeof statusFilters;

export type IssueSearch = {
  status?: StatusFilter;
  assignee?: string;
  // "updated": the latest change first. Missing: the newest issue first.
  sort?: "updated";
  page: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

// Turns ?status=open&assignee=…&page=2 into filters we can trust.
export function parseIssueSearch(params: SearchParams): IssueSearch {
  const status = first(params.status);
  const assignee = first(params.assignee);
  const sort = first(params.sort);
  const page = Math.floor(Number(first(params.page)));

  return {
    status:
      status && Object.hasOwn(statusFilters, status)
        ? (status as StatusFilter)
        : undefined,
    assignee: assignee || undefined,
    sort: sort === "updated" ? sort : undefined,
    // A safe integer is a whole number small enough to count exactly.
    // Infinity and 1e21 aren't, and the database refuses them.
    page: Number.isSafeInteger(page) && page >= 1 ? page : 1,
  };
}

// The way back: filters → a link that shows them.
export function issuesHref(projectId: string, search: IssueSearch) {
  const query = new URLSearchParams();
  if (search.status) query.set("status", search.status);
  if (search.assignee) query.set("assignee", search.assignee);
  if (search.page > 1) query.set("page", String(search.page));

  const text = query.toString();
  return `/projects/${projectId}${text ? `?${text}` : ""}`;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
