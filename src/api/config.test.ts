import { describe, expect, it } from "vitest";

import { resolveApiConfig } from "./config.js";

describe("resolveApiConfig (design.md Migration/Rollout — WRITE_TOOLS_ENABLED flag)", () => {
  it("defaults writeToolsEnabled to false when WRITE_TOOLS_ENABLED is unset", () => {
    const config = resolveApiConfig({});
    expect(config.writeToolsEnabled).toBe(false);
  });

  it("resolves writeToolsEnabled to true only for the exact string \"true\"", () => {
    expect(resolveApiConfig({ WRITE_TOOLS_ENABLED: "true" }).writeToolsEnabled).toBe(true);
    expect(resolveApiConfig({ WRITE_TOOLS_ENABLED: "TRUE" }).writeToolsEnabled).toBe(false);
    expect(resolveApiConfig({ WRITE_TOOLS_ENABLED: "1" }).writeToolsEnabled).toBe(false);
    expect(resolveApiConfig({ WRITE_TOOLS_ENABLED: "false" }).writeToolsEnabled).toBe(false);
  });
});
