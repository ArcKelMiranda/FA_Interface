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
 * LIVE-RESOLVER MERGE STRATEGY (issue #15):
 *   - The live `resolveBatch` from `src/domain/resolve-batch.ts` runs FIRST.
 *   - If it throws (MCP down / read failure), the handler returns a blocking
 *     `502 batch_load_failed` without consulting the store — the existing
 *     blocking-error contract (spec review-ui — Batch Load Failure Blocks
 *     Rendering) is preserved, no stale cached data leaks through.
 *   - If a persisted `BatchAnalysis` snapshot exists, its user overrides are
 *     layered on top of the live resolution via `applyOverridesToBatch` so
 *     user-edited fields always win over freshly-resolved live data.
 *   - If no persisted snapshot exists, the live resolution is returned as-is
 *     — the "brand-new batch" case (no empty response for fresh data).
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { applyOverridesToBatch, resolveBatch } from "../../domain/resolve-batch.js";
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

      let liveBatch;
      try {
        // resolveBatch is the full Phase 2-orchestrator pipeline: it queries
        // MCP for the codes + dedupe catalog + field catalogs, builds each
        // CodeEntry via the deterministic building blocks, and returns a
        // complete BatchAnalysis. This is the ONLY source of the blocking
        // error response — if MCP fails here, we never consult the store.
        liveBatch = await resolveBatch(batchId, deps.readPort);
      } catch (error) {
        request.log.error({ err: error }, "live batch read failed");
        return reply.code(502).send({
          error: "batch_load_failed",
          message: `No se pudo cargar el lote ${batchId} desde yhat-mcp-server.`,
        });
      }

      // Merge: layer any persisted user overrides on top of the fresh live
      // data. If no persisted snapshot exists for this batch, listOverrides
      // returns [] and applyOverridesToBatch returns the live batch as-is.
      // This is the "brand-new batch" case — the live resolution IS the
      // response, no empty 404 for fresh data.
      const overrides = await deps.store.listOverrides(batchId);
      const batch = applyOverridesToBatch(liveBatch, overrides);

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
