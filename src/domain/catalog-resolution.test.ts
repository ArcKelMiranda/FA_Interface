import { describe, expect, it } from "vitest";
import { resolveCatalogValue, type CatalogEntry } from "./catalog-resolution.js";

describe("resolveCatalogValue", () => {
  const catalog: CatalogEntry[] = [
    { id: 1, name: "Miami" },
    { id: 2, name: "São Paulo" },
  ];

  it("returns an exact match when the raw value matches byte-for-byte", () => {
    expect(resolveCatalogValue("Miami", catalog)).toEqual({
      status: "exact",
      entry: { id: 1, name: "Miami" },
    });
  });

  it("returns a normalized match on case difference", () => {
    expect(resolveCatalogValue("miami", catalog)).toEqual({
      status: "normalized",
      entry: { id: 1, name: "Miami" },
    });
  });

  it("returns a normalized match ignoring accents and surrounding whitespace", () => {
    expect(resolveCatalogValue("  sao paulo  ", catalog)).toEqual({
      status: "normalized",
      entry: { id: 2, name: "São Paulo" },
    });
  });

  it("returns none when nothing in the catalog matches", () => {
    expect(resolveCatalogValue("Buenos Aires", catalog)).toEqual({
      status: "none",
      entry: null,
    });
  });

  it("returns none against an empty catalog", () => {
    expect(resolveCatalogValue("Miami", [])).toEqual({
      status: "none",
      entry: null,
    });
  });
});
