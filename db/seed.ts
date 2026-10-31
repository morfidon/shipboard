import { hashPassword } from "better-auth/crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.ts";

const { user, account, organization, member, project, issue } = schema;
const db = drizzle(process.env.DATABASE_URL!, { schema });

// Everyone in the seed signs in with this made-up password. Only for the
// database on your own computer.
const DEMO_PASSWORD = "shipboard-demo";

// Acme's team, with each person's role.
const people = [
  { name: "Maya Chen", email: "maya@example.com", role: "owner" },
  { name: "Tom Novak", email: "tom@example.com", role: "admin" },
  { name: "Lena Fischer", email: "lena@example.com", role: "member" },
  { name: "Sam Ortiz", email: "sam@example.com", role: "member" },
  { name: "Priya Nair", email: "priya@example.com", role: "member" },
];

type Status = "todo" | "in_progress" | "done";
type SeedIssue = [title: string, status: Status, archived?: "archived"];

const projects: { name: string; description: string; issues: SeedIssue[] }[] = [
  {
    name: "Website relaunch",
    description: "A new marketing site with a blog.",
    issues: [
      ["Design the new home page", "done"],
      ["Write the first blog post", "in_progress"],
      ["Add a contact form", "todo"],
      ["Pick a font for headings", "done"],
      ["Set up the blog layout", "done"],
      ["Add an RSS feed", "todo"],
      ["Write the About page", "in_progress"],
      ["Compress the hero images", "todo"],
      ["Add social preview images", "todo"],
      ["Fix the mobile menu", "in_progress"],
      ["Add a cookie banner", "todo"],
      ["Redirect the old blog URLs", "todo"],
      ["Write the pricing page", "todo"],
      ["Add customer logos", "done"],
      ["Check the color contrast", "todo"],
      ["Add a newsletter sign-up", "todo"],
      ["Translate the home page", "todo"],
      ["Add a 404 page", "done"],
      ["Set up analytics", "in_progress"],
      ["Write the privacy policy", "todo"],
      ["Test on slow connections", "todo"],
      ["Add page titles", "todo"],
      ["Prepare the launch checklist", "todo"],
      ["Proofread every page", "todo"],
      ["Old landing page experiment", "todo", "archived"],
    ],
  },
  {
    name: "Mobile app",
    description: "The first version of the iOS and Android app.",
    issues: [
      ["Build the sign-in screen", "in_progress"],
      ["Set up push notifications", "todo"],
      ["Publish a test build", "todo"],
      ["Add dark mode", "todo"],
      ["Design the app icon", "done"],
      ["Make the app work offline", "todo"],
      ["Fix the crash on older Android phones", "in_progress"],
      ["Write the store description", "todo"],
      ["Try a different navigation library", "todo", "archived"],
    ],
  },
  {
    name: "Infrastructure",
    description: "Servers, backups and monitoring.",
    issues: [
      ["Automate daily backups", "done"],
      ["Add uptime monitoring", "in_progress"],
      ["Upgrade the database server", "todo"],
      ["Rotate the API keys", "todo"],
      ["Set up alerts for errors", "todo"],
      ["Document the deploy steps", "done"],
      ["Move DNS to the new provider", "todo"],
    ],
  },
];

const hour = 60 * 60 * 1000;

await db.transaction(async (tx) => {
  // Start from an empty database, children first.
  await tx.delete(issue);
  await tx.delete(project);
  await tx.delete(organization);
  await tx.delete(user);

  // Better Auth keeps passwords in the account table, hashed, the same
  // way sign-up stores them.
  async function addPasswords(userIds: string[]) {
    await tx.insert(account).values(
      await Promise.all(
        userIds.map(async (id) => ({
          id: crypto.randomUUID(),
          userId: id,
          providerId: "credential",
          accountId: id,
          password: await hashPassword(DEMO_PASSWORD),
        })),
      ),
    );
  }

  const users = await tx
    .insert(user)
    .values(
      people.map(({ name, email }) => ({
        id: crypto.randomUUID(),
        name,
        email,
        emailVerified: true,
      })),
    )
    .returning({ id: user.id });
  await addPasswords(users.map(({ id }) => id));

  const [acme] = await tx
    .insert(organization)
    .values({ id: crypto.randomUUID(), name: "Acme", slug: "acme" })
    .returning({ id: organization.id });

  await tx.insert(member).values(
    people.map((person, i) => ({
      id: crypto.randomUUID(),
      organizationId: acme.id,
      userId: users[i].id,
      role: person.role,
    })),
  );

  let age = 0;
  for (const p of projects) {
    const [row] = await tx
      .insert(project)
      .values({
        organizationId: acme.id,
        name: p.name,
        description: p.description,
      })
      .returning({ id: project.id });

    await tx.insert(issue).values(
      p.issues.map(([title, status, archived], i) => ({
        projectId: row.id,
        title,
        status,
        // Every sixth issue has nobody assigned.
        assigneeId: i % 6 === 5 ? null : users[i % users.length].id,
        archivedAt: archived ? new Date() : null,
        // The first issue in each list is the oldest.
        createdAt: new Date(Date.now() - (p.issues.length - i + age) * hour),
      })),
    );
    age += p.issues.length;
  }

  // A second customer, to check that one organization can't see or change
  // another one's issues. Gina Park runs it.
  const [globex] = await tx
    .insert(organization)
    .values({ id: crypto.randomUUID(), name: "Globex", slug: "globex" })
    .returning({ id: organization.id });

  const [gina] = await tx
    .insert(user)
    .values({
      id: crypto.randomUUID(),
      name: "Gina Park",
      email: "gina@example.com",
      emailVerified: true,
    })
    .returning({ id: user.id });
  await addPasswords([gina.id]);
  await tx.insert(member).values({
    id: crypto.randomUUID(),
    organizationId: globex.id,
    userId: gina.id,
    role: "owner",
  });

  const [portal] = await tx
    .insert(project)
    .values({
      organizationId: globex.id,
      name: "Customer portal",
      description: "Self-service billing for Globex customers.",
    })
    .returning({ id: project.id });

  await tx
    .insert(issue)
    .values(
      [
        "Add invoice downloads",
        "Send password reset emails",
        "Show the current plan",
      ].map((title) => ({ projectId: portal.id, title })),
    );
});

const counts = await Promise.all([
  db.$count(user),
  db.$count(organization),
  db.$count(member),
  db.$count(project),
  db.$count(issue),
]);
console.log(
  `Seeded ${counts[0]} users, ${counts[1]} organizations, ${counts[2]} memberships, ${counts[3]} projects and ${counts[4]} issues.`,
);

await db.$client.end();
