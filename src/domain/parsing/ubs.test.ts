import { describe, expect, it } from "vitest";
import { parseUbsBranchRep } from "./ubs.js";

describe("parseUbsBranchRep", () => {
  it.each([
    ["slash-separated branch/rep", "1234/56789", { branch: "1234", rep: "56789" }],
    ["no separator puts everything in branch", "1234", { branch: "1234", rep: "" }],
    ["trims whitespace around each side of the separator", " 1234 / 56789 ", { branch: "1234", rep: "56789" }],
  ] as const)("%s", (_label, raw, expected) => {
    const result = parseUbsBranchRep(raw);
    expect(result.branch).toBe(expected.branch);
    expect(result.rep).toBe(expected.rep);
    expect(result.format).toBe("ubs");
  });
});
