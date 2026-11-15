import { execFileSync } from "node:child_process";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { databaseUrl } from "./server";

// Before the tests: a fresh database for this run, with our migrations and
// the seed.
export default async function globalSetup() {
  // Connected to Vitest's test database: Postgres can't drop the database
  // a connection is using.
  const admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await admin.connect();
  await admin.query("drop database if exists shipboard_e2e_test with (force)");
  await admin.query("create database shipboard_e2e_test");
  await admin.end();

  const db = drizzle(databaseUrl());
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.$client.end();

  // The same seed as pnpm db:seed: Maya, Acme, Globex and their projects.
  execFileSync(process.execPath, ["db/seed.ts"], {
    env: { ...process.env, DATABASE_URL: databaseUrl() },
    stdio: "inherit",
  });
}
