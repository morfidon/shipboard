import "server-only";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { member } from "@/db/schema";
import { auth } from "@/lib/auth";

export type CurrentUser = {
  id: string;
  name: string;
  organizationId: string;
  role: string;
};

// The person behind this request, from their session. No session means
// nobody signed in, so they go to the sign-in page.
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  // The team they work in right now. Every new session gets one
  // (see databaseHooks in lib/auth.ts).
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    redirect("/sign-in");
  }

  // Their role in that team, from the member table. No row means they
  // were removed from the team: they sign in again.
  const [membership] = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(
        eq(member.userId, session.user.id),
        eq(member.organizationId, organizationId),
      ),
    );
  if (!membership) {
    redirect("/sign-in");
  }

  return {
    id: session.user.id,
    name: session.user.name,
    organizationId,
    role: membership.role,
  };
});
