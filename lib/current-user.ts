import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

export type CurrentUser = {
  id: string;
  name: string;
  organizationId: string;
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

  return {
    id: session.user.id,
    name: session.user.name,
    organizationId,
  };
});
