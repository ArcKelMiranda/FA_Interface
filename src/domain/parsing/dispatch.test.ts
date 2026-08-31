import { describe, expect, it } from "vitest";

import { dispatchParseByOrigin, parseGenericBranchRep } from "./dispatch.js";

describe("parseGenericBranchRep", () => {
  it.each([
    ["plain alphanumeric code passes through unchanged", "ABC123", { branch: "ABC123", rep: "" }],
    ["shorter code still passes through", "X1", { branch: "X1", rep: "" }],
    ["trims surrounding whitespace before parsing", "  ABC123  ", { branch: "ABC123", rep: "" }],
  ] as const)("%s", (_label, raw, expected) => {
    const result = parseGenericBranchRep(raw);
    expect(result.raw).toBe(raw);
    expect(result.branch).toBe(expected.branch);
    expect(result.rep).toBe(expected.rep);
    expect(result.format).toBe("generic");
  });
});

describe("dispatchParseByOrigin", () => {
  it.each([
    {
      label: "Pershing fixed-width 4+4 numeric code",
      origin: "Pershing",
      raw: "12345678",
      expected: { branch: "1234", rep: "5678", format: "pershing" as const },
    },
    {
      label: "Pershing origin tolerates whitespace and shorter input",
      origin: "  pershing  ",
      raw: "123",
      expected: { branch: "123", rep: "", format: "pershing" as const },
    },
  ])("$label", ({ origin, raw, expected }) => {
    const result = dispatchParseByOrigin(origin, raw);
    expect(result.branch).toBe(expected.branch);
    expect(result.rep).toBe(expected.rep);
    expect(result.format).toBe(expected.format);
  });

  it.each([
    {
      label: "UBS slash-separated branch/rep",
      origin: "UBS",
      raw: "1234/56789",
      expected: { branch: "1234", rep: "56789", format: "ubs" as const },
    },
    {
      label: "UBS origin tolerates whitespace around the separator",
      origin: "Ubs",
      raw: " 1234 / 56789 ",
      expected: { branch: "1234", rep: "56789", format: "ubs" as const },
    },
  ])("$label", ({ origin, raw, expected }) => {
    const result = dispatchParseByOrigin(origin, raw);
    expect(result.branch).toBe(expected.branch);
    expect(result.rep).toBe(expected.rep);
    expect(result.format).toBe(expected.format);
  });

  it.each([
    {
      label: "Generic origin passes the code through unchanged",
      origin: "Generic",
      raw: "ABC123",
      expected: { branch: "ABC123", rep: "", format: "generic" as const },
    },
    {
      label: "Generic origin trims surrounding whitespace",
      origin: "generic",
      raw: "  ABC123  ",
      expected: { branch: "ABC123", rep: "", format: "generic" as const },
    },
  ])("$label", ({ origin, raw, expected }) => {
    const result = dispatchParseByOrigin(origin, raw);
    expect(result.branch).toBe(expected.branch);
    expect(result.rep).toBe(expected.rep);
    expect(result.format).toBe(expected.format);
  });

  it("falls back to the generic parser for unknown origin names", () => {
    const result = dispatchParseByOrigin("SomeOtherBroker", "ABC123");
    expect(result.format).toBe("generic");
    expect(result.branch).toBe("ABC123");
    expect(result.rep).toBe("");
  });
});
