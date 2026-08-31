// Vitest "web" project setup (jsdom environment) — extends `expect` with
// Testing Library's jest-dom matchers for every src/web/**/*.test.tsx file,
// and unmounts every rendered tree after each test (RTL's auto-cleanup only
// self-registers when `test.globals: true`, which this project does not set).
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
