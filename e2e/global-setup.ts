import { execFileSync } from "node:child_process";
import type { FullConfig } from "@playwright/test";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { allServers, workers } from "./servers";

// Before the tests: one template database with our migrations and the seed,
// then a copy of it for every worker.
export default async function globalSetup(config: FullConfig) {
  // The command line can ask for more workers (--workers=3) than we have
  // servers. Stop here, and say why, instead of failing in the tests.
  if (config.workers > workers) {
    throw new Error(
      `Asked for ${config.workers} workers, but e2e/servers.ts starts ${workers} servers, one per worker. Ask for fewer, or change workers there.`,
    );
  }

  const template = new URL(process.env.DATABASE_URL!);
  template.pathname = "/shipboard_e2e_test";

  // Connected to Vitest's test database: Postgres can't drop or copy the
  // database a connection is using.
  const admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await admin.connect();
  await admin.query("drop database if exists shipboard_e2e_test with (force)");
  await admin.query("create database shipboard_e2e_test");

  const db = drizzle(template.toString());
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.$client.end();
  // The same seed as pnpm db:seed: Maya, Acme, Globex and their projects.
  execFileSync(process.execPath, ["db/seed.ts"], {
    env: { ...process.env, DATABASE_URL: template.toString() },
    stdio: "inherit",
  });

  // A copy for every worker: Postgres copies a template in a moment.
  for (const server of allServers()) {
    const name = new URL(server.databaseUrl).pathname.slice(1);
    await admin.query(`drop database if exists ${name} with (force)`);
    await admin.query(`create database ${name} template shipboard_e2e_test`);
  }
  await admin.end();
}
