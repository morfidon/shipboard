import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { rateLimit } from "@/db/schema";
import { auth } from "@/lib/auth";
import { signInAction, signUpAction } from "@/lib/auth-actions";
import { clientAddress, hit } from "@/lib/rate-limit";

// The actions run outside a real request here: Better Auth, the request's
// headers and redirect() are replaced. The counters use the real database.
vi.mock("@/lib/auth", () => ({
  auth: { api: { signInEmail: vi.fn(), signUpEmail: vi.fn() } },
}));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": "203.0.113.7" })),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

function form(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value);
  }
  return formData;
}

describe("hit", () => {
  it("allows 5 tries and refuses the 6th", async () => {
    const results = [];
    for (let i = 0; i < 6; i++) {
      results.push((await hit("test:key", 5, 60)).allowed);
    }

    expect(results).toEqual([true, true, true, true, true, false]);
  });

  it("starts counting again when the window is over", async () => {
    for (let i = 0; i < 6; i++) {
      await hit("test:key", 5, 60);
    }
    // Move the window's end into the past, as if a minute went by.
    await db
      .update(rateLimit)
      .set({ resetAt: new Date(Date.now() - 1000) })
      .where(eq(rateLimit.key, "test:key"));

    expect((await hit("test:key", 5, 60)).allowed).toBe(true);
  });

  it("counts every key on its own", async () => {
    for (let i = 0; i < 6; i++) {
      await hit("test:maya", 5, 60);
    }

    expect((await hit("test:maya", 5, 60)).allowed).toBe(false);
    expect((await hit("test:tom", 5, 60)).allowed).toBe(true);
  });
});

describe("signInAction", () => {
  it("stops after 5 wrong passwords for one email", async () => {
    vi.mocked(auth.api.signInEmail).mockRejectedValue(
      new APIError("UNAUTHORIZED", { message: "Invalid email or password" }),
    );
    const tryOnce = () =>
      signInAction(
        {},
        form({ email: "maya@example.com", password: "wrong-password" }),
      );

    for (let i = 0; i < 5; i++) {
      expect(await tryOnce()).toEqual({
        message: "Invalid email or password",
        email: "maya@example.com",
      });
    }
    expect(await tryOnce()).toEqual({
      message: "Too many tries. Try again in 15 minutes.",
      email: "maya@example.com",
    });
    // The 6th try never reached Better Auth.
    expect(auth.api.signInEmail).toHaveBeenCalledTimes(5);
  });
});

describe("signUpAction", () => {
  it("stops the 6th sign-up from one address in an hour", async () => {
    const signUp = (n: number) =>
      signUpAction(
        {},
        form({
          name: `Person ${n}`,
          email: `person${n}@example.com`,
          password: "long-enough-password",
        }),
      );

    for (let i = 1; i <= 5; i++) {
      expect(await signUp(i)).toEqual({ sentTo: `person${i}@example.com` });
    }
    expect((await signUp(6)).message).toBe(
      "Too many tries. Try again in 60 minutes.",
    );
    expect(auth.api.signUpEmail).toHaveBeenCalledTimes(5);
  });
});

describe("clientAddress", () => {
  it("takes the address our proxy added: the last one", () => {
    const sent = new Headers({
      "x-forwarded-for": "198.51.100.1, 203.0.113.7",
    });
    expect(clientAddress(sent)).toBe("203.0.113.7");
  });

  it("writes an IPv4 address the same way, even inside IPv6", () => {
    const sent = new Headers({ "x-forwarded-for": "::ffff:203.0.113.7" });
    expect(clientAddress(sent)).toBe("203.0.113.7");
  });
});

describe("the wait in the message", () => {
  it("is the longest one when both limits are used up", async () => {
    const inMinutes = (minutes: number) =>
      new Date(Date.now() + minutes * 60 * 1000);
    await db.insert(rateLimit).values([
      {
        key: "sign-in:email:maya@example.com",
        count: 5,
        resetAt: inMinutes(2),
      },
      { key: "sign-in:address:203.0.113.7", count: 20, resetAt: inMinutes(14) },
    ]);

    const result = await signInAction(
      {},
      form({ email: "maya@example.com", password: "wrong-password" }),
    );

    expect(result.message).toBe("Too many tries. Try again in 14 minutes.");
  });
});
