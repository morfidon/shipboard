import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Understand the "@/..." imports, using the paths in tsconfig.json.
    tsconfigPaths: true,
  },
});
