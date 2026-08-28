/**
 * Field status derivation (spec `review-ui` — Accessibility-Safe Status
 * Encoding). Every table cell / drawer field carries exactly one of four
 * states, encoded elsewhere as texture + color + glyph, never color alone.
 */

import type { CatalogMatchStatus } from "./catalog-resolution.js";

export const FIELD_STATUS = {
  RESOLVED: "resolved",
  NEEDS_CONFIRM: "needs_confirm",
  NEEDS_INPUT: "needs_input",
  NO_DATA: "no_data",
} as const;

export type FieldStatus = (typeof FIELD_STATUS)[keyof typeof FIELD_STATUS];

export interface FieldStatusInput {
  hasRawValue: boolean;
  matchStatus: CatalogMatchStatus;
}

export function deriveFieldStatus(input: FieldStatusInput): FieldStatus {
  if (!input.hasRawValue) return FIELD_STATUS.NO_DATA;
  if (input.matchStatus === "exact") return FIELD_STATUS.RESOLVED;
  if (input.matchStatus === "normalized") return FIELD_STATUS.NEEDS_CONFIRM;
  return FIELD_STATUS.NEEDS_INPUT;
}
