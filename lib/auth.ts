import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { asc, eq } from "drizzle-orm";
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
  databaseHooks: {
    session: {
      create: {
        // Every session starts in one of the person's teams.
        before: async (session) => {
          const activeOrganizationId = await firstTeamOf(session.userId);
          return { data: { ...session, activeOrganizationId } };
        },
      },
    },
  },
  // In a Server Action, the cookies Better Auth sets go to the browser.
  // Keep nextCookies() the last plugin.
  plugins: [organization(), nextCookies()],
});

// The person's oldest team. Someone who has none yet gets a new one,
// with them as its owner.
async function firstTeamOf(userId: string): Promise<string> {
  // One transaction: the team and its owner are made together, or not at
  // all. Locking the person's row first makes a second sign-in at the same
  // moment wait, and then find this team instead of making another one.
  return db.transaction(async (tx) => {
    const [person] = await tx
      .select({ name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .for("update");

    const [first] = await tx
      .select({ organizationId: schema.member.organizationId })
      .from(schema.member)
      .where(eq(schema.member.userId, userId))
      .orderBy(asc(schema.member.createdAt))
      .limit(1);
    if (first) {
      return first.organizationId;
    }

    const organizationId = crypto.randomUUID();
    await tx.insert(schema.organization).values({
      id: organizationId,
      name: `${person.name}'s team`,
      slug: organizationId,
    });
    await tx.insert(schema.member).values({
      id: crypto.randomUUID(),
      organizationId,
      userId,
      role: "owner",
    });
    return organizationId;
  });
}
