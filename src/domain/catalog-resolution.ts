/**
 * Exact + normalized catalog resolution for the 8 live-queried fields
 * (Office, Country, Region, IBD, NSCC, Dealer, Agente, Origin).
 *
 * Replaces v5's embedded catalogs entirely: `entries` come from a live
 * `yhat_query_entities` read (see `YhatReadPort`). This module is pure — it
 * only compares an already-fetched catalog against a raw string.
 */

export interface CatalogEntry {
  id: number;
  name: string;
}

export const CATALOG_MATCH_STATUS = {
  EXACT: "exact",
  NORMALIZED: "normalized",
  NONE: "none",
} as const;

export type CatalogMatchStatus =
  (typeof CATALOG_MATCH_STATUS)[keyof typeof CATALOG_MATCH_STATUS];

export interface CatalogMatch {
  status: CatalogMatchStatus;
  entry: CatalogEntry | null;
}

import { normalizeForMatch } from "./normalize.js";

export function resolveCatalogValue(
  rawValue: string,
  catalog: CatalogEntry[],
): CatalogMatch {
  const exact = catalog.find((entry) => entry.name === rawValue);
  if (exact) {
    return { status: CATALOG_MATCH_STATUS.EXACT, entry: exact };
  }

  const normalizedRaw = normalizeForMatch(rawValue);
  const normalized = catalog.find(
    (entry) => normalizeForMatch(entry.name) === normalizedRaw,
  );
  if (normalized) {
    return { status: CATALOG_MATCH_STATUS.NORMALIZED, entry: normalized };
  }

  return { status: CATALOG_MATCH_STATUS.NONE, entry: null };
}
