import { describe, expect, it } from "vitest";
import { issuesHref, parseIssueSearch } from "@/lib/issue-filters";

describe("parseIssueSearch", () => {
  it("reads the status, the assignee and the page", () => {
    // Arrange: what the address gave us.
    const params = { status: "done", assignee: "user-1", page: "2" };

    // Act
    const search = parseIssueSearch(params);

    // Assert
    expect(search).toEqual({ status: "done", assignee: "user-1", page: 2 });
  });

  it("ignores a status that isn't one of our filters", () => {
    const search = parseIssueSearch({ status: "toString" });

    expect(search.status).toBeUndefined();
  });

  it("takes the first value when a name appears twice", () => {
    const search = parseIssueSearch({ status: ["todo", "done"] });

    expect(search.status).toBe("todo");
  });

  it("uses page 1 when the page is missing or strange", () => {
    expect(parseIssueSearch({}).page).toBe(1);
    expect(parseIssueSearch({ page: "0" }).page).toBe(1);
    expect(parseIssueSearch({ page: "-3" }).page).toBe(1);
    expect(parseIssueSearch({ page: "banana" }).page).toBe(1);
  });

  it("reads the sort, and ignores one it doesn't know", () => {
    expect(parseIssueSearch({ sort: "updated" }).sort).toBe("updated");
    expect(parseIssueSearch({ sort: "title" }).sort).toBeUndefined();
  });

  it("uses page 1 for numbers too big to be a page", () => {
    expect(parseIssueSearch({ page: "Infinity" }).page).toBe(1);
    expect(parseIssueSearch({ page: "1e21" }).page).toBe(1);
  });
});

describe("issuesHref", () => {
  it("keeps the filters in the link", () => {
    expect(issuesHref("p1", { status: "open", page: 2 })).toBe(
      "/projects/p1?status=open&page=2",
    );
  });

  it("keeps the sort in the link", () => {
    expect(issuesHref("p1", { sort: "updated", page: 2 })).toBe(
      "/projects/p1?sort=updated&page=2",
    );
  });

  it("leaves page 1 out of the link", () => {
    expect(issuesHref("p1", { page: 1 })).toBe("/projects/p1");
  });
});
