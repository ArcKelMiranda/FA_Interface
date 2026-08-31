/**
 * Generic `-Unidentified` placeholder (spec `fa-assignment` — Generic
 * Unidentified Placeholder). Assignable to any field or FA when no confident
 * match exists; marked as `resolved` but visually distinct from a real match.
 */

import { FIELD_STATUS, type FieldStatus } from "./status.js";

export const UNIDENTIFIED_PLACEHOLDER = "-Unidentified";

export interface ResolvedFieldValue {
  value: string;
  status: FieldStatus;
  isGenericPlaceholder: boolean;
}

export function resolveToUnidentifiedPlaceholder(): ResolvedFieldValue {
  return {
    value: UNIDENTIFIED_PLACEHOLDER,
    status: FIELD_STATUS.RESOLVED,
    isGenericPlaceholder: true,
  };
}

export function isUnidentifiedPlaceholder(value: string): boolean {
  return value === UNIDENTIFIED_PLACEHOLDER;
}
