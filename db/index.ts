import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export const db = drizzle(process.env.DATABASE_URL!, {
  schema,
  // Print every SQL query in the terminal while we develop.
  logger: process.env.NODE_ENV === "development",
});
