/**
 * `ReviewStateStore` — driven port for durable review state (design.md
 * Interfaces/Contracts, Decision 2; spec persistence). Phase 4 implements
 * this against an embedded WAL-mode SQLite database
 * (`src/store/sqlite/index.ts`); this file declares the contract only, so
 * Phase 3+ code can depend on the port ahead of that implementation.
 */

import type { BatchAnalysis } from "../domain/types.js";

/** A user-applied correction to a single field's live-resolved value. */
export interface FieldOverride {
  value: string;
  valueId?: number;
  overriddenAt: string;
}

/**
 * A persisted user override keyed by `(codeId, field)` — what
 * `listOverrides` returns. Pairs each override's `codeId` and `field` with
 * the `FieldOverride` payload so the live-resolver merge path in
 * `src/api/routes/batches.ts` can layer them on top of freshly-resolved
 * data without re-reading the persisted `BatchAnalysis` snapshot (issue
 * #15 merge strategy).
 */
export interface KeyedFieldOverride {
  codeId: string;
  field: string;
  override: FieldOverride;
}

export const WRITE_PLAN_STATUS = {
  AWAITING_CONFIRMATION: "awaiting_confirmation",
  CONFIRMED: "confirmed",
  EXPIRED: "expired",
} as const;

export type WritePlanStatus =
  (typeof WRITE_PLAN_STATUS)[keyof typeof WRITE_PLAN_STATUS];

/**
 * The persisted shape of `yhat-mcp-server`'s `yhat_write_codes {mode:"plan"}`
 * approval-request response (design.md Write-Confirmation Gate sequence).
 */
export interface WritePlan {
  planId: string;
  statements: string[];
  affectedRows: number;
  expiresAt: string;
  status: WritePlanStatus;
}

export interface ReviewStateStore {
  saveBatch(batch: BatchAnalysis): Promise<void>;
  loadBatch(id: string): Promise<BatchAnalysis | null>;
  putOverride(
    batchId: string,
    codeId: string,
    field: string,
    override: FieldOverride,
  ): Promise<void>;
  /**
   * Lists every user-applied override for a batch, in insertion order
   * (oldest first; later `putOverride` calls replace earlier ones for the
   * same `(codeId, field)` key, so the latest value wins). Returns `[]`
   * when the batch has never been overridden — distinct from "the batch
   * has no persisted snapshot" (which is `loadBatch`'s `null` signal).
   *
   * Read-only counterpart to `putOverride`. Used by the live-resolver merge
   * path in `src/api/routes/batches.ts` to layer user overrides on top of
   * freshly-resolved live data without going through the full persisted
   * snapshot (issue #15).
   */
  listOverrides(batchId: string): Promise<KeyedFieldOverride[]>;
  /** Persists a plan with status `awaiting_confirmation`. */
  savePlan(batchId: string, plan: WritePlan): Promise<void>;
  recordConfirmation(batchId: string, planId: string): Promise<void>;
}
