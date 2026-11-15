import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/current-user";
import { inviteAction } from "@/lib/team-actions";

// Better Auth's invitation and the request are replaced; the counters use
// the real test database.
vi.mock("@/lib/auth", () => ({ auth: { api: { createInvitation: vi.fn() } } }));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

function signedInAs(id: string) {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id,
    name: id,
    organizationId: "acme",
    role: "owner",
  });
}

function invite(n: number) {
  const formData = new FormData();
  formData.set("email", `guest${n}@example.com`);
  formData.set("role", "member");
  return inviteAction({}, formData);
}

describe("inviteAction", () => {
  it("stops the 11th invitation from one person in an hour", async () => {
    signedInAs("maya");

    for (let n = 1; n <= 10; n++) {
      expect(await invite(n)).toEqual({ sentTo: `guest${n}@example.com` });
    }
    expect(await invite(11)).toEqual({
      message: "Too many tries. Try again in 60 minutes.",
    });
    expect(auth.api.createInvitation).toHaveBeenCalledTimes(10);
  });

  it("counts every person on their own", async () => {
    signedInAs("maya");
    for (let n = 1; n <= 11; n++) {
      await invite(n);
    }

    signedInAs("tom");
    expect(await invite(12)).toEqual({ sentTo: "guest12@example.com" });
  });
});
