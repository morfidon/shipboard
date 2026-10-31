import { db } from "@/db";
import { issue, organization, project, user } from "@/db/schema";

// Small helpers that put one row into the test database. Every column has
// a sensible default, so a test only writes down the values it cares about.

export async function createOrganization(
  values: Partial<typeof organization.$inferInsert> = {},
) {
  const id = crypto.randomUUID();
  const [row] = await db
    .insert(organization)
    .values({ id, name: "Acme", slug: id, ...values })
    .returning();
  return row;
}

export async function createUser(
  values: Partial<typeof user.$inferInsert> = {},
) {
  const id = crypto.randomUUID();
  const [row] = await db
    .insert(user)
    .values({ id, name: "Maya Chen", email: `${id}@example.com`, ...values })
    .returning();
  return row;
}

export async function createProject(
  values: Partial<typeof project.$inferInsert> = {},
) {
  const organizationId =
    values.organizationId ?? (await createOrganization()).id;
  const [row] = await db
    .insert(project)
    .values({ name: "Website relaunch", ...values, organizationId })
    .returning();
  return row;
}

export async function createIssue(
  values: Partial<typeof issue.$inferInsert> = {},
) {
  const projectId = values.projectId ?? (await createProject()).id;
  const [row] = await db
    .insert(issue)
    .values({ title: "Fix the logo", ...values, projectId })
    .returning();
  return row;
}
