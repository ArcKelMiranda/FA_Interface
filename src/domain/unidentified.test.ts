import { describe, expect, it } from "vitest";
import {
  UNIDENTIFIED_PLACEHOLDER,
  isUnidentifiedPlaceholder,
  resolveToUnidentifiedPlaceholder,
} from "./unidentified.js";

describe("resolveToUnidentifiedPlaceholder", () => {
  it("resolves to the generic placeholder, marked distinctly as generic", () => {
    expect(resolveToUnidentifiedPlaceholder()).toEqual({
      value: "-Unidentified",
      status: "resolved",
      isGenericPlaceholder: true,
    });
  });
});

describe("isUnidentifiedPlaceholder", () => {
  it.each([
    ["the exact placeholder string", UNIDENTIFIED_PLACEHOLDER, true],
    ["a normally resolved value", "Miami", false],
    ["an empty string", "", false],
  ] as const)("%s", (_label, value, expected) => {
    expect(isUnidentifiedPlaceholder(value)).toBe(expected);
  });
});
