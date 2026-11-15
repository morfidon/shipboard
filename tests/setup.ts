import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { beforeEach } from "vitest";
import { db } from "@/db";

// Tests change data, so refuse any database but a test one.
// (A DATABASE_URL set in the terminal wins over .env.test.)
if (!new URL(process.env.DATABASE_URL!).pathname.endsWith("_test")) {
  throw new Error(
    "DATABASE_URL must point to a test database (a name ending in _test).",
  );
}

// Runs before every test file: give the test database the newest shape,
// using the same migrations as the real one. Done ones are skipped.
await migrate(db, { migrationsFolder: "drizzle" });

// Every test starts with an empty database. TRUNCATE empties tables in one go;
// CASCADE also empties the tables that point to them: projects and issues.
// stripe_event and rate_limit point to neither, so they're named too.
beforeEach(async () => {
  await db.execute(
    sql`truncate table "user", organization, stripe_event, rate_limit cascade`,
  );
});
