import { describe, expect, it } from "vitest";
import { deriveFieldStatus } from "./status.js";

describe("deriveFieldStatus", () => {
  it.each([
    ["exact catalog match resolves the field", { hasRawValue: true, matchStatus: "exact" }, "resolved"],
    ["normalized match needs user confirmation", { hasRawValue: true, matchStatus: "normalized" }, "needs_confirm"],
    ["no catalog match but a raw value needs manual input", { hasRawValue: true, matchStatus: "none" }, "needs_input"],
    ["no raw value at all means no data", { hasRawValue: false, matchStatus: "none" }, "no_data"],
    ["no raw value wins even if a stray match status is exact", { hasRawValue: false, matchStatus: "exact" }, "no_data"],
  ] as const)("%s", (_label, input, expected) => {
    expect(deriveFieldStatus(input)).toBe(expected);
  });
});
