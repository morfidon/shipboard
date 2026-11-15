import { readFile } from "node:fs/promises";

// For now the server's terminal is its inbox: lib/auth.ts prints every email
// it would send. Each test server's terminal goes to a file, and this reads
// the newest link sent to an address there, or undefined while there is none.
export async function newestLink(port: number, email: string) {
  const log = await readFile(`playwright/.servers/${port}.log`, "utf8");
  const line = log
    .split("\n")
    .filter((text) => text.includes(` ${email}`))
    .at(-1);
  return line?.match(/https?:\/\/\S+/)?.[0];
}
