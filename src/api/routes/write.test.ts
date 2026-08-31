import Fastify, { type FastifyInstance } from "fastify";
import { describe, expect, it, vi } from "vitest";

import type { BatchAnalysis } from "../../domain/types.js";
import type { FieldOverride, ReviewStateStore, WritePlan } from "../../ports/ReviewStateStore.js";
import { PLAN_CONFIRMATION_ERROR_KIND, PlanConfirmationError } from "../../store/sqlite/errors.js";
import { registerWriteRoutes, type WriteRouteDeps, type WriteToolClient } from "./write.js";

function makeResolvedBatch(overrides: Partial<BatchAnalysis> = {}): BatchAnalysis {
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
          agente: { value: "A1", status: "resolved" },
        },
        fa: [{ id: 1, name: "Some Fa", state: "existente", status: "resolved" }],
      },
    ],
    ...overrides,
  };
}

function makeUnresolvedBatch(): BatchAnalysis {
  const batch = makeResolvedBatch();
  batch.codes[0]!.fields.agente.status = "needs_confirm";
  return batch;
}

function makeStore(overrides: Partial<ReviewStateStore> = {}): ReviewStateStore {
  return {
    saveBatch: vi.fn(async (_batch: BatchAnalysis) => {}),
    loadBatch: vi.fn(async (_id: string) => null),
    putOverride: vi.fn(
      async (_batchId: string, _codeId: string, _field: string, _override: FieldOverride) => {},
    ),
    savePlan: vi.fn(async (_batchId: string, _plan: WritePlan) => {}),
    recordConfirmation: vi.fn(async (_batchId: string, _planId: string) => {}),
    ...overrides,
  };
}

function makeWriteClient(overrides: Partial<WriteToolClient> = {}): WriteToolClient {
  return {
    planWrite: vi.fn(async (_batchId: string, _batch: BatchAnalysis) => ({
      planId: "mcp-plan-1",
      statements: ["INSERT INTO Codes (id) VALUES (1)"],
      affectedRows: 1,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    })),
    ...overrides,
  };
}

function buildApp(deps: WriteRouteDeps): FastifyInstance {
  const app = Fastify();
  registerWriteRoutes(app, deps);
  return app;
}

describe("POST /api/batches/:batchId/write-plan (spec write-confirmation — Full Write Preview Rendering)", () => {
  it("calls the MCP write client's planWrite only when WRITE_TOOLS_ENABLED is true", async () => {
    const writeClient = makeWriteClient();
    const store = makeStore({ loadBatch: vi.fn(async () => makeResolvedBatch()) });
    const app = buildApp({ store, writeToolsEnabled: true, writeClient });

    const response = await app.inject({ method: "POST", url: "/api/batches/42/write-plan" });

    expect(response.statusCode).toBe(200);
    expect(writeClient.planWrite).toHaveBeenCalledTimes(1);
    expect(store.savePlan).toHaveBeenCalledWith(
      "42",
      expect.objectContaining({ planId: "mcp-plan-1", status: "awaiting_confirmation" }),
    );
  });

  it("never calls the MCP write client when WRITE_TOOLS_ENABLED is false, but still persists a plan", async () => {
    const writeClient = makeWriteClient();
    const store = makeStore({ loadBatch: vi.fn(async () => makeResolvedBatch()) });
    const app = buildApp({ store, writeToolsEnabled: false, writeClient });

    const response = await app.inject({ method: "POST", url: "/api/batches/42/write-plan" });

    expect(response.statusCode).toBe(200);
    expect(writeClient.planWrite).not.toHaveBeenCalled();
    expect(store.savePlan).toHaveBeenCalledWith(
      "42",
      expect.objectContaining({ status: "awaiting_confirmation" }),
    );
    const [, savedPlan] = (store.savePlan as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      WritePlan,
    ];
    expect(savedPlan.statements.length).toBeGreaterThan(0);
  });

  it("returns 404 when the batch does not exist", async () => {
    const store = makeStore();
    const app = buildApp({ store, writeToolsEnabled: false });

    const response = await app.inject({ method: "POST", url: "/api/batches/42/write-plan" });

    expect(response.statusCode).toBe(404);
  });

  it("returns 409 when the batch is not fully resolved yet", async () => {
    const store = makeStore({ loadBatch: vi.fn(async () => makeUnresolvedBatch()) });
    const app = buildApp({ store, writeToolsEnabled: false });

    const response = await app.inject({ method: "POST", url: "/api/batches/42/write-plan" });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error: "batch_not_fully_resolved" });
    expect(store.savePlan).not.toHaveBeenCalled();
  });
});

describe("POST /api/batches/:batchId/write-commit (spec write-confirmation — Two-Step Explicit Confirmation)", () => {
  it("asserts planId match + non-expiry via the store, then returns 501 while the flag is false", async () => {
    const store = makeStore({
      recordConfirmation: vi.fn(async (_batchId: string, _planId: string) => {}),
    });
    const app = buildApp({ store, writeToolsEnabled: false });

    const response = await app.inject({
      method: "POST",
      url: "/api/batches/42/write-commit",
      payload: { planId: "plan-1" },
    });

    expect(store.recordConfirmation).toHaveBeenCalledWith("42", "plan-1");
    expect(response.statusCode).toBe(501);
    expect(response.json()).toMatchObject({ error: "write_tools_unavailable" });
  });

  it("maps a plan_id_mismatch from the store to 409 without returning 501", async () => {
    const store = makeStore({
      recordConfirmation: vi.fn(async () => {
        throw new PlanConfirmationError(
          PLAN_CONFIRMATION_ERROR_KIND.PLAN_ID_MISMATCH,
          "planId does not match",
        );
      }),
    });
    const app = buildApp({ store, writeToolsEnabled: false });

    const response = await app.inject({
      method: "POST",
      url: "/api/batches/42/write-commit",
      payload: { planId: "wrong-plan" },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error: PLAN_CONFIRMATION_ERROR_KIND.PLAN_ID_MISMATCH });
  });

  it("maps a plan_expired from the store to 410", async () => {
    const store = makeStore({
      recordConfirmation: vi.fn(async () => {
        throw new PlanConfirmationError(PLAN_CONFIRMATION_ERROR_KIND.PLAN_EXPIRED, "plan expired");
      }),
    });
    const app = buildApp({ store, writeToolsEnabled: false });

    const response = await app.inject({
      method: "POST",
      url: "/api/batches/42/write-commit",
      payload: { planId: "plan-1" },
    });

    expect(response.statusCode).toBe(410);
    expect(response.json()).toMatchObject({ error: PLAN_CONFIRMATION_ERROR_KIND.PLAN_EXPIRED });
  });

  it("accepts no statements in the commit body — a body carrying statements is rejected as invalid", async () => {
    const store = makeStore();
    const app = buildApp({ store, writeToolsEnabled: false });

    const response = await app.inject({
      method: "POST",
      url: "/api/batches/42/write-commit",
      payload: { planId: "plan-1", statements: ["DROP TABLE Codes"] },
    });

    expect(response.statusCode).toBe(400);
    expect(store.recordConfirmation).not.toHaveBeenCalled();
  });
});

describe("Write-confirmation invariant (spec write-confirmation — invariant, sequence diagram): no single request path both plans and commits", () => {
  it("rejects a commit for a batch that never had a plan persisted (no_plan) — proving there is no combined plan+commit call", async () => {
    const store = makeStore({
      recordConfirmation: vi.fn(async () => {
        throw new PlanConfirmationError(PLAN_CONFIRMATION_ERROR_KIND.NO_PLAN, "no plan exists");
      }),
    });
    const app = buildApp({ store, writeToolsEnabled: false });

    const response = await app.inject({
      method: "POST",
      url: "/api/batches/42/write-commit",
      payload: { planId: "plan-1" },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: PLAN_CONFIRMATION_ERROR_KIND.NO_PLAN });
  });

  it("write-plan alone never confirms the plan or invokes a commit call", async () => {
    const writeClient = makeWriteClient({ commitWrite: vi.fn(async () => {}) });
    const store = makeStore({ loadBatch: vi.fn(async () => makeResolvedBatch()) });
    const app = buildApp({ store, writeToolsEnabled: true, writeClient });

    await app.inject({ method: "POST", url: "/api/batches/42/write-plan" });

    expect(store.recordConfirmation).not.toHaveBeenCalled();
    expect(writeClient.commitWrite).not.toHaveBeenCalled();
  });
});
