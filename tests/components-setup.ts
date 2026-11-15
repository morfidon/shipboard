// Matchers for the page, like toBeDisabled() and toHaveAttribute().
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// After every test: take its components off the page, and forget what it
// saved in the browser. The next test starts with an empty page.
afterEach(() => {
  cleanup();
  localStorage.clear();
});
