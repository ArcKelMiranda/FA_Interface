import { describe, expect, it } from "vitest";
import { isFalseCompanyMatch } from "./false-company.js";

describe("isFalseCompanyMatch", () => {
  it.each([
    ["matches a default red-flag pattern case-insensitively", "Empresa PRUEBA SA", true],
    ["matches when the name is exactly a placeholder pattern", "sin nombre", true],
    ["does not match an ordinary Agente/FA name", "Vontobel Asset Management", false],
    ["does not match an empty name", "", false],
  ] as const)("%s", (_label, name, expected) => {
    expect(isFalseCompanyMatch(name)).toBe(expected);
  });

  it("honors a custom pattern list instead of the default", () => {
    expect(isFalseCompanyMatch("Acme Holdings", ["acme"])).toBe(true);
    expect(isFalseCompanyMatch("Vontobel", ["acme"])).toBe(false);
  });
});
