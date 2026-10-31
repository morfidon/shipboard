import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { organization, user } from "@/db/schema";

export type CurrentUser = {
  id: string;
  name: string;
  organizationId: string;
};

// For now, every visitor is Maya Chen, and she works at Acme.
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const [maya] = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.email, "maya@example.com"));
  const [acme] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, "acme"));

  return { ...maya, organizationId: acme.id };
});
