import nextEnv from "@next/env";
import { defineConfig } from "vitest/config";

// Load .env.test (and .env) the same way Next.js does when NODE_ENV is "test".
nextEnv.loadEnvConfig(process.cwd());

// Tests against a production build: `pnpm test:production` builds the app,
// then these tests start it and talk to it over HTTP.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ["production/**/*.test.ts"],
    // The same test database, with the same guard and empty tables.
    setupFiles: ["tests/setup.ts"],
    // One server on one port, so one test file at a time.
    fileParallelism: false,
    // A real server answers more slowly than a function call.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
