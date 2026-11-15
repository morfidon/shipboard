import path from "node:path";
import nextEnv from "@next/env";
import { defineConfig } from "vitest/config";

// Load .env.test (and .env) the same way Next.js does when NODE_ENV is "test".
nextEnv.loadEnvConfig(process.cwd());

export default defineConfig({
  resolve: {
    // Understand the "@/..." imports, using the paths in tsconfig.json.
    tsconfigPaths: true,
    alias: {
      "server-only": path.join(import.meta.dirname, "tests/server-only.ts"),
    },
  },
  test: {
    coverage: {
      // Measure only lib/, where our logic lives.
      include: ["lib/**/*.ts"],
    },
    projects: [
      {
        test: {
          name: "unit",
          include: ["lib/**/*.test.ts"],
        },
      },
      {
        test: {
          // Tests that need the test database.
          name: "integration",
          include: ["tests/**/*.test.ts"],
          setupFiles: ["tests/setup.ts"],
          // One database, so one test file at a time.
          fileParallelism: false,
        },
      },
      {
        test: {
          // Components, in a browser made of JavaScript (jsdom).
          name: "components",
          include: ["components/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["tests/components-setup.ts"],
        },
      },
    ],
  },
});
