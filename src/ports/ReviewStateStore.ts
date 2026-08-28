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
  /** Persists a plan with status `awaiting_confirmation`. */
  savePlan(batchId: string, plan: WritePlan): Promise<void>;
  recordConfirmation(batchId: string, planId: string): Promise<void>;
}
