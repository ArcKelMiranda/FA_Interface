import { describe, expect, it } from "vitest";

// Phase 1 scaffold harness: proves `npm test` runs under Vitest before any
// domain logic exists. Phase 2 replaces this with real RED/GREEN suites
// under src/domain/ and can remove this file once real coverage lands.
describe("test harness", () => {
  it("runs under vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
