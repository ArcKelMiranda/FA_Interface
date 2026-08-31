import { describe, expect, it } from "vitest";
import { checkDuplicate, type LiveCodeRecord } from "./dedupe.js";

describe("checkDuplicate", () => {
  const liveCodes: LiveCodeRecord[] = [
    { branchRep: "1234-5678" },
    { branchRep: "AB01-99" },
  ];

  it.each([
    ["exact match against a live BranchRep", "1234-5678", liveCodes, "existente"],
    ["no match against any live BranchRep", "0000-0000", liveCodes, "nuevo"],
    ["case-insensitive match", "ab01-99", liveCodes, "existente"],
    ["whitespace-padded match", "  1234-5678  ", liveCodes, "existente"],
    ["empty live catalog always yields nuevo", "1234-5678", [], "nuevo"],
  ] as const)("%s", (_label, branchRep, catalog, expected) => {
    expect(checkDuplicate(branchRep, catalog as LiveCodeRecord[])).toBe(expected);
  });
});
