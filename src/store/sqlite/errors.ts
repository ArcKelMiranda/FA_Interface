/**
 * Error taxonomy for `SqliteReviewStateStore.recordConfirmation` (spec
 * write-confirmation — Two-Step Explicit Confirmation; design.md
 * Write-Confirmation Gate sequence: "API->>DB: assert planId matches the
 * persisted plan and has not expired"). The store enforces this assertion
 * itself so no caller can ever record a confirmation against a plan that
 * was never issued, has already expired, or does not match what the user
 * actually reviewed.
 */

export const PLAN_CONFIRMATION_ERROR_KIND = {
  /** No write plan has ever been saved for this batch. */
  NO_PLAN: "no_plan",
  /** The supplied planId does not match the currently persisted plan. */
  PLAN_ID_MISMATCH: "plan_id_mismatch",
  /** The persisted plan's `expiresAt` has already elapsed. */
  PLAN_EXPIRED: "plan_expired",
} as const;

export type PlanConfirmationErrorKind =
  (typeof PLAN_CONFIRMATION_ERROR_KIND)[keyof typeof PLAN_CONFIRMATION_ERROR_KIND];

export class PlanConfirmationError extends Error {
  readonly kind: PlanConfirmationErrorKind;

  constructor(kind: PlanConfirmationErrorKind, message: string) {
    super(message);
    this.name = "PlanConfirmationError";
    this.kind = kind;
  }
}

/**
 * Thrown by `SqliteReviewStateStore.putOverride` when `field` is not one of
 * the known overridable fields (`src/store/sqlite/index.ts`'s
 * `OVERRIDABLE_FIELDS`). Without this check an unknown field name would be
 * written to the `overrides` table and then silently dropped by
 * `applyOverrides` on the next `loadBatch`, with no error surfaced anywhere.
 */
export class InvalidOverrideFieldError extends Error {
  readonly field: string;

  constructor(field: string) {
    super(`"${field}" is not a known overridable field`);
    this.name = "InvalidOverrideFieldError";
    this.field = field;
  }
}
