import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

// Everything about signing in: where Better Auth keeps users and sessions,
// and how people prove who they are.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    // No session until the person proves the email address is theirs.
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    // Signing in before verifying sends a fresh link.
    sendOnSignIn: true,
    // The link in the email also signs them in.
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // For now, the terminal is our inbox.
      console.log(`Verify ${user.email}: ${url}`);
    },
  },
  // In a Server Action, the cookies Better Auth sets go to the browser.
  // Keep it the last plugin.
  plugins: [nextCookies()],
});
