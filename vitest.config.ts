import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Two Vitest projects (Vitest 3.2 replaced `environmentMatchGlobs` with
// `test.projects`): server/domain/store/api code (Phases 2-5) runs under
// "node"; the React SPA (Phase 6, src/web/**/*.test.tsx) runs under "jsdom"
// with the React plugin and Testing Library's jest-dom matchers.
export default defineConfig({
  test: {
    reporters: "default",
    projects: [
      {
        test: {
          name: "server",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        plugins: [react()],
        test: {
          name: "web",
          environment: "jsdom",
          include: ["src/web/**/*.test.tsx"],
          setupFiles: ["src/web/test/setup.ts"],
        },
      },
    ],
  },
});
