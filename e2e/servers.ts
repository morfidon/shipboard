// Each worker gets its own server and its own database. Worker 0 talks to
// port 3200 and shipboard_e2e_0_test, worker 1 to 3201 and ..._1_test.
export const workers = 2;

export function serverFor(index: number) {
  // Only the servers in allServers() exist: a worker past them has none.
  if (index >= workers) {
    throw new Error(
      `Worker ${index} has no server: e2e/servers.ts starts ${workers}.`,
    );
  }
  const port = 3200 + index;
  const database = new URL(process.env.DATABASE_URL!);
  database.pathname = `/shipboard_e2e_${index}_test`;
  return {
    port,
    url: `http://localhost:${port}`,
    databaseUrl: database.toString(),
  };
}

export function allServers() {
  return Array.from({ length: workers }, (_, index) => serverFor(index));
}
