/**
 * Shared string-normalization utilities extracted from `dedupe.ts`,
 * `fa-propagation.ts`, and `catalog-resolution.ts` (task 2.9 REFACTOR).
 */

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

/** Trim + uppercase — used to compare BranchRep values (2.1 dedupe, 2.2 propagation). */
export function normalizeBranchRep(value: string): string {
  return value.trim().toUpperCase();
}

/** Trim + lowercase + strip diacritics — used for catalog fuzzy matching (2.4). */
export function normalizeForMatch(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(COMBINING_DIACRITICS, "");
}
