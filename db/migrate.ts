// Applies the migrations in drizzle/ to DATABASE_URL, with the same function
// our tests use. Unlike drizzle-kit migrate, it prints the database's error.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const db = drizzle(process.env.DATABASE_URL!);
await migrate(db, { migrationsFolder: "drizzle" });
await db.$client.end();
console.log("Migrations applied.");
