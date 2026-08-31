import Fastify, { type FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BatchAnalysis } from "../../domain/types.js";
import type { EntityQuery, YhatReadPort } from "../../ports/YhatReadPort.js";
import type {
  FieldOverride,
  KeyedFieldOverride,
  ReviewStateStore,
  WritePlan,
} from "../../ports/ReviewStateStore.js";
import { InvalidOverrideFieldError } from "../../store/sqlite/errors.js";
import { registerBatchesRoutes } from "./batches.js";

function makeBatch(): BatchAnalysis {
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
  };
}

/** Minimal fake `YhatReadPort` — this test layer never talks to a real MCP server. */
function makeReadPort(overrides: Partial<YhatReadPort> = {}): YhatReadPort {
  return {
    queryEntities: vi.fn(async (_query: EntityQuery) => []),
    ...overrides,
  };
}

/** Minimal fake `ReviewStateStore` — this test layer never talks to real SQLite. */
function makeStore(overrides: Partial<ReviewStateStore> = {}): ReviewStateStore {
  return {
    saveBatch: vi.fn(async (_batch: BatchAnalysis) => {}),
    loadBatch: vi.fn(async (_id: string) => null),
    putOverride: vi.fn(
      async (_batchId: string, _codeId: string, _field: string, _override: FieldOverride) => {},
    ),
    listOverrides: vi.fn(async (_batchId: string) => [] as KeyedFieldOverride[]),
    savePlan: vi.fn(async (_batchId: string, _plan: WritePlan) => {}),
    recordConfirmation: vi.fn(async (_batchId: string, _planId: string) => {}),
    ...overrides,
  };
}

function buildApp(readPort: YhatReadPort, store: ReviewStateStore): FastifyInstance {
  const app = Fastify();
  registerBatchesRoutes(app, { readPort, store });
  return app;
}

/**
 * Read-port stub that returns canned rows per entity so `resolveBatch`
 * (the live orchestrator) can produce a meaningful BatchAnalysis. Mirrors
 * the shape used by `src/domain/resolve-batch.test.ts` and exercises the
 * production-parity path end-to-end without a real MCP server.
 */
function makeReadPortWithLiveData(): YhatReadPort {
  const rowsByEntity: Record<string, Record<string, unknown>[]> = {
    Codes: [
      {
        Id: "code-1",
        BranchRep: "0001-0002",
        RepName: "Jane Doe",
        Office: "NY",
        Country: "US",
        Region: "NE",
        IBD: "IBD1",
        NSCC: "NSCC1",
        Origin: "PERSHING",
        Dealer: "D1",
        Agente: "A1",
      },
    ],
    Offices: [{ Id: 100, Name: "NY" }],
    Countries: [{ Id: 1, Name: "US" }],
    Regions: [{ Id: 10, Name: "NE" }],
    IBDs: [{ Id: 50, Name: "IBD1" }],
    Origins: [{ Id: 5, Name: "PERSHING" }],
    Dealers: [{ Id: 60, Name: "D1" }],
    Agentes: [{ Id: 70, Name: "A1" }],
    FAs: [{ Id: 999, Name: "Existing Fa" }],
  };
  return makeReadPort({
    queryEntities: vi.fn(async (query: EntityQuery) => rowsByEntity[query.entity] ?? []),
  });
}

describe("GET /api/batches/:batchId (spec review-ui — Live Batch Table Rendering)", () => {
  it("returns a live-resolved BatchAnalysis when MCP returns matching codes and catalogs", async () => {
    const readPort = makeReadPortWithLiveData();
    const store = makeStore();
    const app = buildApp(readPort, store);

    const response = await app.inject({ method: "GET", url: "/api/batches/42" });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { batch: BatchAnalysis };
    expect(body.batch.codes).toHaveLength(1);
    expect(body.batch.codes[0]!.fields.office).toMatchObject({ value: "NY", status: "resolved" });
    expect(body.batch.codes[0]!.fields.agente).toMatchObject({ value: "A1", status: "resolved" });
    // store.loadBatch is never consulted in the live path — the only
    // store call is listOverrides, which is the merge seam.
    expect(store.loadBatch).not.toHaveBeenCalled();
    expect(store.listOverrides).toHaveBeenCalledWith("42");
  });

  it("returns a 200 with empty codes when MCP returns no rows for the batch (brand-new batch case, issue #15)", async () => {
    const readPort = makeReadPort(); // queryEntities returns [] for any entity
    const store = makeStore();
    const app = buildApp(readPort, store);

    const response = await app.inject({ method: "GET", url: "/api/batches/does-not-exist" });

    expect(response.statusCode).toBe(200);
    // JSON has no NaN, so the unparseable `Number("does-not-exist")` round-trips
    // as `null`. What matters: codes is empty and there is NO `error` field —
    // a brand-new batch is a live empty resolution, not 404.
    expect(response.json()).toMatchObject({
      batch: { codes: [] },
    });
    expect(response.json()).not.toMatchObject({ error: expect.anything() });
  });

  it("layers persisted user overrides on top of the live resolution so user-edited fields win", async () => {
    const readPort = makeReadPortWithLiveData();
    const store = makeStore({
      listOverrides: vi.fn(async () => [
        {
          codeId: "code-1",
          field: "office",
          override: {
            value: "User-Edited Office",
            valueId: 999,
            overriddenAt: "2026-08-31T02:00:00.000Z",
          },
        },
      ]),
    });
    const app = buildApp(readPort, store);

    const response = await app.inject({ method: "GET", url: "/api/batches/42" });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { batch: BatchAnalysis };
    expect(body.batch.codes[0]!.fields.office).toMatchObject({
      value: "User-Edited Office",
      valueId: 999,
      status: "resolved",
    });
    // Non-overridden fields are still live.
    expect(body.batch.codes[0]!.fields.country.value).toBe("US");
  });
});

describe("GET /api/batches/:batchId (spec review-ui — Batch Load Failure Blocks Rendering)", () => {
  let readPort: YhatReadPort;
  let store: ReviewStateStore;
  let app: FastifyInstance;

  beforeEach(() => {
    readPort = makeReadPort({
      queryEntities: vi.fn(async () => {
        throw new Error("yhat-mcp-server request timed out");
      }),
    });
    store = makeStore({ loadBatch: vi.fn(async () => makeBatch()) });
    app = buildApp(readPort, store);
  });

  it("returns a blocking error, not a partial table, when the live MCP read fails", async () => {
    const response = await app.inject({ method: "GET", url: "/api/batches/42" });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({ error: "batch_load_failed" });
  });

  it("never reads or returns cached/persisted row data once the live read has failed", async () => {
    await app.inject({ method: "GET", url: "/api/batches/42" });

    expect(store.loadBatch).not.toHaveBeenCalled();
  });
});

describe("PUT /api/batches/:batchId/codes/:codeId/fields/:field (spec persistence — Durable Override Writes)", () => {
  it("persists a valid override and responds 204", async () => {
    const readPort = makeReadPort();
    const store = makeStore();
    const app = buildApp(readPort, store);

    const response = await app.inject({
      method: "PUT",
      url: "/api/batches/42/codes/code-1/fields/office",
      payload: { value: "Overridden Office", valueId: 99 },
    });

    expect(response.statusCode).toBe(204);
    expect(store.putOverride).toHaveBeenCalledWith(
      "42",
      "code-1",
      "office",
      expect.objectContaining({ value: "Overridden Office", valueId: 99 }),
    );
  });

  it("maps InvalidOverrideFieldError from the store to a 400 response", async () => {
    const readPort = makeReadPort();
    const store = makeStore({
      putOverride: vi.fn(async () => {
        throw new InvalidOverrideFieldError("not_a_real_field");
      }),
    });
    const app = buildApp(readPort, store);

    const response = await app.inject({
      method: "PUT",
      url: "/api/batches/42/codes/code-1/fields/not_a_real_field",
      payload: { value: "whatever" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "invalid_override_field" });
  });

  it("rejects a body missing the required value field", async () => {
    const readPort = makeReadPort();
    const store = makeStore();
    const app = buildApp(readPort, store);

    const response = await app.inject({
      method: "PUT",
      url: "/api/batches/42/codes/code-1/fields/office",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(store.putOverride).not.toHaveBeenCalled();
  });
});
