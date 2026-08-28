import { describe, expect, it } from "vitest";
import { parsePershingBranchRep } from "./pershing.js";

describe("parsePershingBranchRep", () => {
  it.each([
    ["fixed-width 4+4 numeric code", "12345678", { branch: "1234", rep: "5678" }],
    ["shorter-than-8 code puts everything in branch", "123", { branch: "123", rep: "" }],
    ["trims surrounding whitespace before parsing", "  12345678  ", { branch: "1234", rep: "5678" }],
  ] as const)("%s", (_label, raw, expected) => {
    const result = parsePershingBranchRep(raw);
    expect(result.branch).toBe(expected.branch);
    expect(result.rep).toBe(expected.rep);
    expect(result.format).toBe("pershing");
  });
});
