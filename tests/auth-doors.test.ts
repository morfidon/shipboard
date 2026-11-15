import { describe, expect, it } from "vitest";
import { auth } from "@/lib/auth";

// Better Auth's own web addresses for these three are closed. Only our
// actions, with our limits, can sign in, sign up and invite.
describe("Better Auth's own doors", () => {
  it.each(["/sign-in/email", "/sign-up/email", "/organization/invite-member"])(
    "answers 404 at %s",
    async (path) => {
      const response = await auth.handler(
        new Request(`http://localhost:3000/api/auth${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost:3000",
          },
          body: JSON.stringify({
            email: "maya@example.com",
            password: "wrong-password",
          }),
        }),
      );

      expect(response.status).toBe(404);
    },
  );
});
