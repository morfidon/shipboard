import Form from "next/form";
import { Button } from "@/components/ui/button";
import type { Person } from "@/lib/data";
import type { IssueSearch } from "@/lib/issue-filters";

const selectClass = "h-9 rounded-md border bg-background px-2 text-sm";

export function IssueFilters({
  search,
  people,
}: {
  search: IssueSearch;
  people: Person[];
}) {
  return (
    // A GET form: submitting it puts the choices into the URL.
    <Form action="" className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Status
        <select
          name="status"
          defaultValue={search.status ?? ""}
          className={selectClass}
        >
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Assignee
        <select
          name="assignee"
          defaultValue={search.assignee ?? ""}
          className={selectClass}
        >
          <option value="">Anyone</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Sort
        <select
          name="sort"
          defaultValue={search.sort ?? ""}
          className={selectClass}
        >
          <option value="">Newest</option>
          <option value="updated">Recently updated</option>
        </select>
      </label>
      <Button type="submit" variant="outline">
        Apply
      </Button>
    </Form>
  );
}
