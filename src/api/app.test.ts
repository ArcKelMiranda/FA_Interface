import { describe, expect, it, vi } from "vitest";

import type { BatchAnalysis } from "../domain/types.js";
import type { FieldOverride, ReviewStateStore, WritePlan } from "../ports/ReviewStateStore.js";
import type { EntityQuery, YhatReadPort } from "../ports/YhatReadPort.js";
import { buildApp } from "./app.js";
import type { WriteToolClient } from "./routes/write.js";

function makeResolvedBatch(): BatchAnalysis {
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
        fa: [],
      },
    ],
  };
}

function makeReadPort(): YhatReadPort {
  return { queryEntities: vi.fn(async (_query: EntityQuery) => []) };
}

function makeStore(overrides: Partial<ReviewStateStore> = {}): ReviewStateStore {
  return {
    saveBatch: vi.fn(async (_batch: BatchAnalysis) => {}),
    loadBatch: vi.fn(async (_id: string) => makeResolvedBatch()),
    putOverride: vi.fn(
      async (_batchId: string, _codeId: string, _field: string, _override: FieldOverride) => {},
    ),
    savePlan: vi.fn(async (_batchId: string, _plan: WritePlan) => {}),
    recordConfirmation: vi.fn(async (_batchId: string, _planId: string) => {}),
    ...overrides,
  };
}

describe("buildApp (task 5.7 — WRITE_TOOLS_ENABLED wired through Fastify config/plugin registration)", () => {
  it("registers batches routes reachable via the built app", async () => {
    const app = buildApp({
      readPort: makeReadPort(),
      store: makeStore(),
      config: { writeToolsEnabled: false },
    });

    const response = await app.inject({ method: "GET", url: "/api/batches/42" });
    expect(response.statusCode).toBe(200);
  });

  it("propagates config.writeToolsEnabled=true into the write-plan route's MCP call", async () => {
    const writeClient: WriteToolClient = {
      planWrite: vi.fn(async () => ({
        planId: "mcp-plan-1",
        statements: ["stmt"],
        affectedRows: 1,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      })),
    };

    const app = buildApp({
      readPort: makeReadPort(),
      store: makeStore(),
      config: { writeToolsEnabled: true },
      writeClient,
    });

    await app.inject({ method: "POST", url: "/api/batches/42/write-plan" });

    expect(writeClient.planWrite).toHaveBeenCalledTimes(1);
  });

  it("propagates config.writeToolsEnabled=false so the write-plan route never touches the MCP write client", async () => {
    const writeClient: WriteToolClient = {
      planWrite: vi.fn(async () => ({
        planId: "mcp-plan-1",
        statements: ["stmt"],
        affectedRows: 1,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      })),
    };

    const app = buildApp({
      readPort: makeReadPort(),
      store: makeStore(),
      config: { writeToolsEnabled: false },
      writeClient,
    });

    await app.inject({ method: "POST", url: "/api/batches/42/write-plan" });

    expect(writeClient.planWrite).not.toHaveBeenCalled();
  });
});
