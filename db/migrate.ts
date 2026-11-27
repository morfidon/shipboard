// Applies the migrations in drizzle/ to DATABASE_URL, with the same function
// our tests use. Unlike drizzle-kit migrate, it prints the database's error.
import { readFileSync } from "node:fs";
import nextEnv from "@next/env";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// The same settings the app reads: .env.local, then .env. A value that is
// already set wins, like the job's DATABASE_URL on GitHub.
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to .env.");
}

const db = drizzle(process.env.DATABASE_URL);
await migrate(db, { migrationsFolder: "drizzle" });

// Drizzle runs a migration only if it's newer than the last one this
// database ran. One with an older date is skipped, without an error.
const listed = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"))
  .entries.length;
const { rows } = await db.execute<{ ran: number }>(
  sql`select count(*)::int as ran from drizzle.__drizzle_migrations`,
);
await db.$client.end();
if (rows[0].ran !== listed) {
  throw new Error(
    `Only ${rows[0].ran} of ${listed} migrations ran. Is a new one dated before the last one?`,
  );
}
console.log(`Migrations applied: ${listed} of ${listed}.`);
