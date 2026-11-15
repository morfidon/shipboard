import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db";
import { account } from "@/db/schema";
import {
  createMember,
  createOrganization,
  createUser,
} from "../tests/factories";

const PORT = 3100;
const base = `http://localhost:${PORT}`;
let server: ChildProcess | undefined;

// Starts the production build (`next build` ran first) against the test
// database, the same way `next start` does on a real server.
export async function startServer() {
  // Port 3100 must be free. Another server there would answer our requests,
  // with another database.
  if (await answers()) {
    throw new Error(`Port ${PORT} is busy. Stop the server that uses it.`);
  }
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", String(PORT)],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        BETTER_AUTH_URL: base,
        // Production refuses Better Auth's built-in secret. This one lives
        // only as long as the test run.
        BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
      },
    },
  );
  server = child;
  // Keep what it prints, to show it if it stops before it answers.
  let output = "";
  child.stdout?.on("data", (chunk) => (output += chunk));
  child.stderr?.on("data", (chunk) => (output += chunk));

  // Wait until it answers.
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) {
      throw new Error(`The server stopped before it answered:\n${output}`);
    }
    if (await answers()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`The server at ${base} didn't start:\n${output}`);
}

// Does anything answer on our port? Each try waits a second at most.
async function answers() {
  try {
    await fetch(base, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch {
    return false;
  }
}

// Stops the server and waits until it's gone, so the next test file can
// start its own on the same port.
export async function stopServer() {
  const child = server;
  // Nothing to stop: it never started, or it has already stopped.
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill();
  await exited;
}

const PASSWORD = "test-password-123";

// A new team with one owner, signed in. Returns the team's id and the
// session cookie, ready for the next requests.
export async function signedInOwner() {
  const team = await createOrganization();
  const person = await createUser({ emailVerified: true });
  await db.insert(account).values({
    id: crypto.randomUUID(),
    userId: person.id,
    accountId: person.id,
    providerId: "credential",
    password: await hashPassword(PASSWORD),
  });
  await createMember({
    organizationId: team.id,
    userId: person.id,
    role: "owner",
  });

  const response = await fetch(`${base}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({ email: person.email, password: PASSWORD }),
  });
  if (!response.ok) {
    throw new Error(`Signing in failed: ${response.status}`);
  }
  const cookie = response.headers
    .getSetCookie()
    .map((line) => line.split(";")[0])
    .join("; ");
  return { organizationId: team.id, cookie };
}

// The id of a Server Action, from the list the build writes. That list is
// an internal file of Next.js, so check this after an upgrade.
function actionId(name: string) {
  const manifest = JSON.parse(
    readFileSync(".next/server/server-reference-manifest.json", "utf8"),
  ) as { node: Record<string, { exportedName: string }> };
  const found = Object.entries(manifest.node).find(
    ([, action]) => action.exportedName === name,
  );
  if (!found) {
    throw new Error(`No Server Action called ${name} in the build.`);
  }
  return found[0];
}

// Calls a Server Action over HTTP, much like the browser does: a POST with
// the action's id in a header, and its arguments as JSON in the body. JSON
// is enough for simple arguments, like an id and a status. A form sends
// FormData, which needs React's own encoding: a job for a browser test.
export async function callAction(
  cookie: string,
  name: string,
  args: unknown[],
) {
  const response = await fetch(`${base}/dashboard`, {
    method: "POST",
    headers: {
      "Next-Action": actionId(name),
      "Content-Type": "text/plain;charset=UTF-8",
      Cookie: cookie,
    },
    body: JSON.stringify(args),
  });
  await response.text();
  return response.status;
}

// The three numbers (to do, in progress, done) of the first card on a page.
// Every test team has one project, so that's its card.
export async function numbersOn(cookie: string, path: string) {
  const response = await fetch(`${base}${path}`, {
    headers: { Cookie: cookie },
  });
  const html = await response.text();
  const [todo, inProgress, done] = [
    ...html.matchAll(/<dd[^>]*>(\d+)<\/dd>/g),
  ].map((match) => Number(match[1]));
  return { todo, inProgress, done };
}
