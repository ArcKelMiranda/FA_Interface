/**
 * `GET /api/batches/:batchId` and `PUT /api/batches/:batchId/codes/:codeId/fields/:field`
 * — the read/override half of the SPA REST surface (design.md File Changes;
 * spec review-ui — Live Batch Table Rendering, Batch Load Failure Blocks
 * Rendering; spec persistence — Durable Override Writes).
 *
 * Wired directly to `YhatReadPort` (live MCP reads) and `ReviewStateStore`
 * (the concrete `SqliteReviewStateStore` from Work Unit 4) — no new business
 * logic lives here, only HTTP <-> port translation.
 *
 * BLOCKING-ERROR CONTRACT (spec review-ui — Batch Load Failure Blocks
 * Rendering): the live read via `YhatReadPort.queryEntities` always runs
 * BEFORE the store is consulted. If it throws, this handler returns
 * immediately with a blocking error and never calls `store.loadBatch` — so a
 * live failure can never surface stale/cached row data.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { ReviewStateStore } from "../../ports/ReviewStateStore.js";
import type { YhatReadPort } from "../../ports/YhatReadPort.js";
import { InvalidOverrideFieldError } from "../../store/sqlite/errors.js";

export interface BatchesRouteDeps {
  readPort: YhatReadPort;
  store: ReviewStateStore;
}

const overrideBodySchema = z.object({
  value: z.string(),
  valueId: z.number().optional(),
});

export function registerBatchesRoutes(app: FastifyInstance, deps: BatchesRouteDeps): void {
  app.get<{ Params: { batchId: string } }>(
    "/api/batches/:batchId",
    async (request, reply) => {
      const { batchId } = request.params;

      try {
        // A live-liveness read per PRD's `Codes` entity. This is deliberately
        // the ONLY thing that can produce the blocking-error response below
        // — no full live-resolver pipeline exists yet (Phase 2 built the
        // deterministic building blocks; their orchestration into a fresh
        // `BatchAnalysis` is a known, separately-tracked gap, not this
        // route's job). The persisted `BatchAnalysis` snapshot from
        // `ReviewStateStore` remains the source of the returned row data.
        await deps.readPort.queryEntities({
          entity: "Codes",
          filters: [{ attribute: "BatchNo", operator: "=", value: Number(batchId) }],
        });
      } catch (error) {
        request.log.error({ err: error }, "live batch read failed");
        return reply.code(502).send({
          error: "batch_load_failed",
          message: `No se pudo cargar el lote ${batchId} desde yhat-mcp-server.`,
        });
      }

      const batch = await deps.store.loadBatch(batchId);
      if (!batch) {
        return reply.code(404).send({ error: "batch_not_found" });
      }

      return reply.code(200).send({ batch });
    },
  );

  app.put<{ Params: { batchId: string; codeId: string; field: string } }>(
    "/api/batches/:batchId/codes/:codeId/fields/:field",
    async (request, reply) => {
      const parsed = overrideBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "invalid_override_body",
          issues: parsed.error.issues,
        });
      }

      const { batchId, codeId, field } = request.params;

      try {
        await deps.store.putOverride(batchId, codeId, field, {
          value: parsed.data.value,
          ...(parsed.data.valueId !== undefined ? { valueId: parsed.data.valueId } : {}),
          overriddenAt: new Date().toISOString(),
        });
      } catch (error) {
        if (error instanceof InvalidOverrideFieldError) {
          return reply.code(400).send({ error: "invalid_override_field", field: error.field });
        }
        throw error;
      }

      return reply.code(204).send();
    },
  );
}
