import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { BatchAnalysis } from "../../domain/types.js";
import type { FieldOverride, WritePlan } from "../../ports/ReviewStateStore.js";
import { InvalidOverrideFieldError, PLAN_CONFIRMATION_ERROR_KIND, PlanConfirmationError } from "./errors.js";
import { SqliteReviewStateStore } from "./index.js";

function makeBatch(overrides: Partial<BatchAnalysis> = {}): BatchAnalysis {
  return {
    contractVersion: "1.0.0",
    batchNo: 42,
    snapshot: "2026-08-31T00:00:00.000Z",
    codes: [
      {
        id: "code-1",
        branchRep: "0001-0002",
        repName: "Jane Doe",
        fields: {
          office: { value: "NY", status: "resolved" },
          country: { value: "US", status: "resolved" },
          region: { value: "NE", status: "resolved" },
          ibd: { value: "IBD1", status: "resolved" },
          nscc: { value: "NSCC1", status: "resolved" },
          origin: { value: "PERSHING", status: "resolved" },
          dealer: { value: "D1", status: "resolved" },
          agente: { value: "A1", status: "needs_confirm" },
        },
        fa: [],
      },
    ],
    ...overrides,
  };
}

function makePlan(overrides: Partial<WritePlan> = {}): WritePlan {
  return {
    planId: "plan-1",
    statements: ["INSERT INTO Codes (id) VALUES (1)"],
    affectedRows: 1,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    status: "awaiting_confirmation",
    ...overrides,
  };
}

let dir: string;
let dbPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "facodes-sqlite-"));
  dbPath = join(dir, "review-state.db");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("SqliteReviewStateStore.saveBatch/loadBatch (spec persistence — Restart Survival)", () => {
  it("round-trips a saved batch", async () => {
    const store = new SqliteReviewStateStore(dbPath);
    const batch = makeBatch();
    await store.saveBatch(batch);

    const loaded = await store.loadBatch(String(batch.batchNo));
    expect(loaded).toEqual(batch);
    store.close();
  });

  it("returns null for an unknown batch reference", async () => {
    const store = new SqliteReviewStateStore(dbPath);
    const loaded = await store.loadBatch("does-not-exist");
    expect(loaded).toBeNull();
    store.close();
  });

  it("overwrites the previous snapshot when the same batch is saved again", async () => {
    const store = new SqliteReviewStateStore(dbPath);
    const batch = makeBatch();
    await store.saveBatch(batch);

    const updated = makeBatch({ snapshot: "2026-08-31T09:00:00.000Z" });
    await store.saveBatch(updated);

    const loaded = await store.loadBatch(String(batch.batchNo));
    expect(loaded?.snapshot).toBe("2026-08-31T09:00:00.000Z");
    store.close();
  });
});

describe("SqliteReviewStateStore.putOverride (spec persistence — Durable Override Writes)", () => {
  it("persists the write before the returned promise resolves, durable across a second connection", async () => {
    const store = new SqliteReviewStateStore(dbPath);
    const batch = makeBatch();
    await store.saveBatch(batch);

    const override: FieldOverride = {
      value: "Overridden Office",
      valueId: 99,
      overriddenAt: "2026-08-31T01:00:00.000Z",
    };
    await store.putOverride(String(batch.batchNo), "code-1", "office", override);

    // A brand-new connection to the same file proves the write already
    // completed durably before putOverride's promise resolved, not merely
    // that this process's in-memory state remembers it.
    const raw = new Database(dbPath, { readonly: true });
    const row = raw
      .prepare(
        "SELECT value, value_id FROM overrides WHERE batch_id = ? AND code_id = ? AND field = ?",
      )
      .get(String(batch.batchNo), "code-1", "office") as
      | { value: string; value_id: number }
      | undefined;
    raw.close();

    expect(row?.value).toBe("Overridden Office");
    expect(row?.value_id).toBe(99);
    store.close();
  });

  it("applies the override on top of the stored field when the batch is reloaded", async () => {
    const store = new SqliteReviewStateStore(dbPath);
    const batch = makeBatch();
    await store.saveBatch(batch);

    await store.putOverride(String(batch.batchNo), "code-1", "office", {
      value: "Overridden Office",
      valueId: 99,
      overriddenAt: "2026-08-31T01:00:00.000Z",
    });

    const loaded = await store.loadBatch(String(batch.batchNo));
    expect(loaded?.codes[0]?.fields.office).toMatchObject({
      value: "Overridden Office",
      valueId: 99,
      status: "resolved",
    });
    // An untouched field is unaffected by the override.
    expect(loaded?.codes[0]?.fields.country.value).toBe("US");
    store.close();
  });

  it("overwrites an earlier override for the same field with the latest value", async () => {
    const store = new SqliteReviewStateStore(dbPath);
    const batch = makeBatch();
    await store.saveBatch(batch);

    await store.putOverride(String(batch.batchNo), "code-1", "office", {
      value: "First Override",
      overriddenAt: "2026-08-31T01:00:00.000Z",
    });
    await store.putOverride(String(batch.batchNo), "code-1", "office", {
      value: "Second Override",
      overriddenAt: "2026-08-31T01:05:00.000Z",
    });

    const loaded = await store.loadBatch(String(batch.batchNo));
    expect(loaded?.codes[0]?.fields.office.value).toBe("Second Override");
    store.close();
  });

  it("rejects an unknown field name instead of silently persisting a row that load will drop", async () => {
    const store = new SqliteReviewStateStore(dbPath);
    const batch = makeBatch();
    await store.saveBatch(batch);

    await expect(
      store.putOverride(String(batch.batchNo), "code-1", "not_a_real_field", {
        value: "whatever",
        overriddenAt: "2026-08-31T01:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(InvalidOverrideFieldError);

    store.close();
  });
});

describe("SqliteReviewStateStore.savePlan/recordConfirmation (spec write-confirmation — Two-Step Explicit Confirmation)", () => {
  it("transitions a matching, unexpired plan to confirmed and records the confirmation", async () => {
    const store = new SqliteReviewStateStore(dbPath);
    const batch = makeBatch();
    await store.saveBatch(batch);
    const plan = makePlan();
    await store.savePlan(String(batch.batchNo), plan);

    await expect(
      store.recordConfirmation(String(batch.batchNo), plan.planId),
    ).resolves.toBeUndefined();

    const raw = new Database(dbPath, { readonly: true });
    const planRow = raw
      .prepare("SELECT status FROM plans WHERE batch_id = ?")
      .get(String(batch.batchNo)) as { status: string } | undefined;
    const confirmationRow = raw
      .prepare("SELECT plan_id FROM confirmations WHERE batch_id = ?")
      .get(String(batch.batchNo)) as { plan_id: string } | undefined;
    raw.close();

    expect(planRow?.status).toBe("confirmed");
    expect(confirmationRow?.plan_id).toBe(plan.planId);
    store.close();
  });

  it("rejects a mismatched planId and leaves the plan awaiting confirmation", async () => {
    const store = new SqliteReviewStateStore(dbPath);
    const batch = makeBatch();
    await store.saveBatch(batch);
    await store.savePlan(String(batch.batchNo), makePlan());

    await expect(
      store.recordConfirmation(String(batch.batchNo), "wrong-plan-id"),
    ).rejects.toMatchObject({ kind: PLAN_CONFIRMATION_ERROR_KIND.PLAN_ID_MISMATCH });

    const raw = new Database(dbPath, { readonly: true });
    const planRow = raw
      .prepare("SELECT status FROM plans WHERE batch_id = ?")
      .get(String(batch.batchNo)) as { status: string } | undefined;
    raw.close();
    expect(planRow?.status).toBe("awaiting_confirmation");
    store.close();
  });

  it("rejects an expired plan", async () => {
    const store = new SqliteReviewStateStore(dbPath);
    const batch = makeBatch();
    await store.saveBatch(batch);
    const expiredPlan = makePlan({ expiresAt: new Date(Date.now() - 1000).toISOString() });
    await store.savePlan(String(batch.batchNo), expiredPlan);

    await expect(
      store.recordConfirmation(String(batch.batchNo), expiredPlan.planId),
    ).rejects.toBeInstanceOf(PlanConfirmationError);
    await expect(
      store.recordConfirmation(String(batch.batchNo), expiredPlan.planId),
    ).rejects.toMatchObject({ kind: PLAN_CONFIRMATION_ERROR_KIND.PLAN_EXPIRED });
    store.close();
  });

  it("rejects confirmation when no plan has ever been saved for the batch", async () => {
    const store = new SqliteReviewStateStore(dbPath);
    const batch = makeBatch();
    await store.saveBatch(batch);

    await expect(
      store.recordConfirmation(String(batch.batchNo), "plan-1"),
    ).rejects.toMatchObject({ kind: PLAN_CONFIRMATION_ERROR_KIND.NO_PLAN });
    store.close();
  });
});

describe("SqliteReviewStateStore restart survival (spec persistence — Batch Retrieval by Reference)", () => {
  it("retrieves the last-persisted batch and override state after reopening the store from the same file", async () => {
    const store = new SqliteReviewStateStore(dbPath);
    const batch = makeBatch();
    await store.saveBatch(batch);
    await store.putOverride(String(batch.batchNo), "code-1", "office", {
      value: "Reopened Office",
      overriddenAt: "2026-08-31T02:00:00.000Z",
    });
    store.close();

    // Simulate a service restart: a brand-new store instance re-applies the
    // same forward-only migrations against the existing database file.
    const reopened = new SqliteReviewStateStore(dbPath);
    const loaded = await reopened.loadBatch(String(batch.batchNo));

    expect(loaded?.codes[0]?.fields.office.value).toBe("Reopened Office");
    reopened.close();
  });

  it("does not error when migrations are re-applied against an already-migrated file", async () => {
    const first = new SqliteReviewStateStore(dbPath);
    first.close();

    let second: SqliteReviewStateStore | undefined;
    expect(() => {
      second = new SqliteReviewStateStore(dbPath);
    }).not.toThrow();
    second?.close();
  });
});
