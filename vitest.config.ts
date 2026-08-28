import { defineConfig } from "vitest/config";

// Server/domain/store/api code (Phases 2-5) runs under "node". Phase 6 adds
// a `jsdom` Vitest project for src/web/**/*.test.tsx at that point — kept
// out of this config for now since Vitest 3.2 deprecated
// `environmentMatchGlobs` in favor of `test.projects`, and there are no web
// tests to configure yet.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    reporters: "default",
  },
});
