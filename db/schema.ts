import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// The same shape Better Auth's schema generator produces.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// The same shape as Better Auth's organization plugin.
export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const issueStatus = pgEnum("issue_status", [
  "todo",
  "in_progress",
  "done",
]);

export const project = pgTable(
  "project",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("project_organization_id_idx").on(table.organizationId)],
);

export const issue = pgTable(
  "issue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: issueStatus("status").notNull().default("todo"),
    assigneeId: text("assignee_id").references(() => user.id, {
      onDelete: "set null",
    }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("issue_project_id_status_idx").on(table.projectId, table.status),
    index("issue_assignee_id_idx").on(table.assigneeId),
  ],
);

export const organizationRelations = relations(organization, ({ many }) => ({
  projects: many(project),
}));

export const projectRelations = relations(project, ({ one, many }) => ({
  organization: one(organization, {
    fields: [project.organizationId],
    references: [organization.id],
  }),
  issues: many(issue),
}));

export const issueRelations = relations(issue, ({ one }) => ({
  project: one(project, {
    fields: [issue.projectId],
    references: [project.id],
  }),
  assignee: one(user, {
    fields: [issue.assigneeId],
    references: [user.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  assignedIssues: many(issue),
}));
