import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { organization } from "@/db/schema";
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

  // For now, everyone who signs in works at Acme.
  const [acme] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, "acme"));

  return {
    id: session.user.id,
    name: session.user.name,
    organizationId: acme.id,
  };
});
