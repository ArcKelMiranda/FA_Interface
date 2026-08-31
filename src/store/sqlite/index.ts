/**
 * `SqliteReviewStateStore` — `ReviewStateStore` port implementation
 * (design.md Interfaces/Contracts, Decision 2; spec persistence,
 * write-confirmation) over an embedded WAL-mode `better-sqlite3` database.
 * Forward-only migrations (`./migrations/*.sql`) are applied at
 * construction time (design.md Decision 2 — "applied at boot").
 *
 * SINGLE-WRITER / SINGLE-USER SCOPE (spec persistence — Single-User Scope):
 * this store assumes exactly one facodes process writing to one database
 * file at a time, matching the product's single-MR usage model. It
 * deliberately implements NO optimistic-locking, conflict-detection, or
 * merge logic for concurrent edits by different users — `putOverride` and
 * `savePlan` always overwrite the previous value for a given key
 * (last-write-wins). WAL mode gives one-writer/many-readers concurrency at
 * the SQLite level, but this module adds nothing on top of it. If a future
 * requirement needs multi-user conflict resolution, that is a new
 * capability on top of this store, not a change to its existing contract.
 */

import Database, { type Database as DatabaseType } from "better-sqlite3";

import type { BatchAnalysis, CodeEntry } from "../../domain/types.js";
import type {
  FieldOverride,
  ReviewStateStore,
  WritePlan,
} from "../../ports/ReviewStateStore.js";
import { PLAN_CONFIRMATION_ERROR_KIND, PlanConfirmationError } from "./errors.js";
import { runMigrations } from "./migrate.js";

export { PLAN_CONFIRMATION_ERROR_KIND, PlanConfirmationError } from "./errors.js";

const OVERRIDABLE_FIELDS = [
  "office",
  "country",
  "region",
  "ibd",
  "nscc",
  "origin",
  "dealer",
  "agente",
] as const;

type OverridableField = (typeof OVERRIDABLE_FIELDS)[number];

function isOverridableField(field: string): field is OverridableField {
  return (OVERRIDABLE_FIELDS as readonly string[]).includes(field);
}

interface OverrideRow {
  code_id: string;
  field: string;
  value: string;
  value_id: number | null;
}

interface PlanRow {
  plan_id: string;
  expires_at: string;
}

export class SqliteReviewStateStore implements ReviewStateStore {
  private readonly db: DatabaseType;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    runMigrations(this.db);
  }

  async saveBatch(batch: BatchAnalysis): Promise<void> {
    const id = String(batch.batchNo);
    this.db
      .prepare(
        `INSERT INTO batches (id, batch_no, data, updated_at)
         VALUES (@id, @batchNo, @data, @updatedAt)
         ON CONFLICT(id) DO UPDATE SET
           batch_no = excluded.batch_no,
           data = excluded.data,
           updated_at = excluded.updated_at`,
      )
      .run({
        id,
        batchNo: batch.batchNo,
        data: JSON.stringify(batch),
        updatedAt: new Date().toISOString(),
      });
  }

  async loadBatch(id: string): Promise<BatchAnalysis | null> {
    const row = this.db.prepare("SELECT data FROM batches WHERE id = ?").get(id) as
      | { data: string }
      | undefined;
    if (!row) return null;

    const batch = JSON.parse(row.data) as BatchAnalysis;
    const overrides = this.db
      .prepare(
        "SELECT code_id, field, value, value_id FROM overrides WHERE batch_id = ?",
      )
      .all(id) as OverrideRow[];

    return applyOverrides(batch, overrides);
  }

  async putOverride(
    batchId: string,
    codeId: string,
    field: string,
    override: FieldOverride,
  ): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO overrides (batch_id, code_id, field, value, value_id, overridden_at)
         VALUES (@batchId, @codeId, @field, @value, @valueId, @overriddenAt)
         ON CONFLICT(batch_id, code_id, field) DO UPDATE SET
           value = excluded.value,
           value_id = excluded.value_id,
           overridden_at = excluded.overridden_at`,
      )
      .run({
        batchId,
        codeId,
        field,
        value: override.value,
        valueId: override.valueId ?? null,
        overriddenAt: override.overriddenAt,
      });
  }

  async savePlan(batchId: string, plan: WritePlan): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO plans (batch_id, plan_id, statements, affected_rows, expires_at, status)
         VALUES (@batchId, @planId, @statements, @affectedRows, @expiresAt, @status)
         ON CONFLICT(batch_id) DO UPDATE SET
           plan_id = excluded.plan_id,
           statements = excluded.statements,
           affected_rows = excluded.affected_rows,
           expires_at = excluded.expires_at,
           status = excluded.status`,
      )
      .run({
        batchId,
        planId: plan.planId,
        statements: JSON.stringify(plan.statements),
        affectedRows: plan.affectedRows,
        expiresAt: plan.expiresAt,
        status: plan.status,
      });
  }

  async recordConfirmation(batchId: string, planId: string): Promise<void> {
    const row = this.db
      .prepare("SELECT plan_id, expires_at FROM plans WHERE batch_id = ?")
      .get(batchId) as PlanRow | undefined;

    if (!row) {
      throw new PlanConfirmationError(
        PLAN_CONFIRMATION_ERROR_KIND.NO_PLAN,
        `No write plan exists for batch ${batchId}`,
      );
    }

    if (row.plan_id !== planId) {
      throw new PlanConfirmationError(
        PLAN_CONFIRMATION_ERROR_KIND.PLAN_ID_MISMATCH,
        `planId "${planId}" does not match the persisted plan for batch ${batchId}`,
      );
    }

    if (new Date(row.expires_at).getTime() <= Date.now()) {
      throw new PlanConfirmationError(
        PLAN_CONFIRMATION_ERROR_KIND.PLAN_EXPIRED,
        `Plan "${planId}" for batch ${batchId} has expired`,
      );
    }

    const confirmPlan = this.db.transaction(() => {
      this.db.prepare("UPDATE plans SET status = 'confirmed' WHERE batch_id = ?").run(batchId);
      this.db
        .prepare(
          "INSERT INTO confirmations (batch_id, plan_id, confirmed_at) VALUES (?, ?, ?)",
        )
        .run(batchId, planId, new Date().toISOString());
    });
    confirmPlan();
  }

  /** Closes the underlying SQLite connection. Not part of `ReviewStateStore`. */
  close(): void {
    this.db.close();
  }
}

function applyOverrides(batch: BatchAnalysis, overrides: OverrideRow[]): BatchAnalysis {
  if (overrides.length === 0) return batch;

  const codesById = new Map<string, CodeEntry>(batch.codes.map((code) => [code.id, code]));

  for (const override of overrides) {
    const code = codesById.get(override.code_id);
    if (!code || !isOverridableField(override.field)) continue;

    const existingField = code.fields[override.field];
    const updatedField: typeof existingField = {
      ...existingField,
      value: override.value,
      status: "resolved",
    };

    if (override.value_id === null) {
      delete updatedField.valueId;
    } else {
      updatedField.valueId = override.value_id;
    }

    code.fields[override.field] = updatedField;
  }

  return batch;
}
