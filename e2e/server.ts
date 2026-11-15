// Our test server: a production build on its own port, with its own
// database next to the one Vitest uses.
export const port = 3200;
export const baseURL = `http://localhost:${port}`;

export function databaseUrl() {
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = "/shipboard_e2e_test";
  return url.toString();
}
