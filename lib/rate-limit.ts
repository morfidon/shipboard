import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimit } from "@/db/schema";

// Counts one try for this key ("sign-in:email:…") and says if it's still
// allowed: at most `limit` tries per window. One statement in the database,
// so two servers, or two tries at the same moment, can't miscount.
export async function hit(key: string, limit: number, windowSeconds: number) {
  const windowEnd = sql`now() + make_interval(secs => ${windowSeconds})`;
  const [row] = await db
    .insert(rateLimit)
    .values({ key, count: 1, resetAt: windowEnd })
    .onConflictDoUpdate({
      target: rateLimit.key,
      // A window that's over starts again at 1. Otherwise: one more try.
      set: {
        count: sql`case when ${rateLimit.resetAt} <= now() then 1 else ${rateLimit.count} + 1 end`,
        resetAt: sql`case when ${rateLimit.resetAt} <= now() then ${windowEnd} else ${rateLimit.resetAt} end`,
      },
    })
    .returning({ count: rateLimit.count, resetAt: rateLimit.resetAt });

  return {
    allowed: row.count <= limit,
    retryAfterSeconds: Math.max(
      0,
      Math.ceil((row.resetAt.getTime() - Date.now()) / 1000),
    ),
  };
}

// The message for someone who has to wait.
export function tooManyTries(retryAfterSeconds: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many tries. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

// The visitor's address. Our contract: the app sits behind one proxy that
// sets x-forwarded-for (a host like Vercel, or Caddy), and nobody reaches the
// app around it. So we take the last address: the one our proxy added.
export function clientAddress(requestHeaders: Headers) {
  const last = requestHeaders.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  if (!last) {
    return "unknown";
  }
  // An IPv4 address can arrive written as IPv6: ::ffff:203.0.113.7.
  return last.toLowerCase().replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, "");
}
