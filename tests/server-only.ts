// Next.js handles `import "server-only"` by itself. Vitest doesn't know it,
// and tests run on the server anyway, so in tests it imports this empty file.
export {};
