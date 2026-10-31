import { describe, expect, it } from "vitest";
import { can } from "@/lib/permissions";

// Every role against every action: the whole table, one row per test.
const matrix = [
  ["owner", "create", true],
  ["owner", "update", true],
  ["owner", "archive", true],
  ["admin", "create", true],
  ["admin", "update", true],
  ["admin", "archive", true],
  ["member", "create", true],
  ["member", "update", true],
  ["member", "archive", false],
  ["viewer", "create", false],
  ["viewer", "update", false],
  ["viewer", "archive", false],
] as const;

describe("can", () => {
  it.each(matrix)("%s may %s issues: %s", (role, action, allowed) => {
    expect(can(role, action)).toBe(allowed);
  });

  it("refuses a role it doesn't know", () => {
    expect(can("intern", "update")).toBe(false);
  });
});
