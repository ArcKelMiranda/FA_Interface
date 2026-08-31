/**
 * `POST /api/batches/:batchId/write-plan` and
 * `POST /api/batches/:batchId/write-commit` — the write-confirmation gate
 * (design.md Write-Confirmation Gate sequence; spec write-confirmation —
 * Full Write Preview Rendering, Commit Action Disabled Until Upstream Write
 * Tools Exist, Two-Step Explicit Confirmation).
 *
 * WRITE_TOOLS_ENABLED GATING (design.md Migration/Rollout): `yhat-mcp-server`
 * has no write tools today (tasks.md 8.4, blocked external dependency), so
 * `WRITE_TOOLS_ENABLED` defaults to `false`:
 *   - write-plan: while the flag is false, the plan step "degrades to a
 *     locally-rendered preview built by domain/" (design.md) — no MCP call
 *     is made. `buildLocalWritePlan` below is that local preview builder.
 *     While the flag is true, the plan is requested from `WriteToolClient`
 *     (the future adapter that calls `yhat_write_codes {mode:"plan"}`).
 *   - write-commit: `ReviewStateStore.recordConfirmation` performs the
 *     "assert planId matches the persisted plan and has not expired" step
 *     from the sequence diagram (Work Unit 4) — this route only maps its
 *     thrown `PlanConfirmationError` to the right HTTP status. While the
 *     flag is false, `yhat_write_codes {mode:"commit"}` is NEVER SENT and
 *     the route always answers `501 write_tools_unavailable`, matching the
 *     sequence diagram's UI copy verbatim.
 *
 * `WriteToolClient` is an injectable seam only — no concrete MCP-calling
 * implementation exists yet. Wiring it to `yhat-mcp-server`'s real write
 * tool is task 8.4, blocked on that sibling project shipping write support.
 */

import { randomUUID } from "node:crypto";

import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { buildLocalWritePlan } from "../../domain/build-write-plan.js";
import type { BatchAnalysis } from "../../domain/types.js";
import type { ReviewStateStore, WritePlan } from "../../ports/ReviewStateStore.js";
import { WRITE_PLAN_STATUS } from "../../ports/ReviewStateStore.js";
import { PlanConfirmationError, PLAN_CONFIRMATION_ERROR_KIND } from "../../store/sqlite/errors.js";

export interface WriteToolPlanResult {
  planId: string;
  statements: string[];
  affectedRows: number;
  expiresAt: string;
}

export interface WriteToolClient {
  /** Calls yhat-mcp-server's `yhat_write_codes {mode:"plan"}` (design.md sequence). */
  planWrite(batchId: string, batch: BatchAnalysis): Promise<WriteToolPlanResult>;
  /**
   * Calls yhat-mcp-server's `yhat_write_codes {mode:"commit"}` (design.md
   * sequence). Optional because no concrete implementation exists yet — see
   * module doc.
   */
  commitWrite?(batchId: string, planId: string): Promise<void>;
}

export interface WriteRouteDeps {
  store: ReviewStateStore;
  writeToolsEnabled: boolean;
  writeClient?: WriteToolClient;
}

const commitBodySchema = z
  .object({
    planId: z.string(),
  })
  .strict();

const WRITE_TOOLS_UNAVAILABLE_MESSAGE =
  "Confirmación registrada. La escritura está deshabilitada: yhat-mcp-server aún no expone herramientas de escritura.";

/** 15 minutes — how long a locally-built plan preview stays confirmable. */
const LOCAL_PLAN_TTL_MS = 15 * 60 * 1000;

export function registerWriteRoutes(app: FastifyInstance, deps: WriteRouteDeps): void {
  app.post<{ Params: { batchId: string } }>(
    "/api/batches/:batchId/write-plan",
    async (request, reply) => {
      const { batchId } = request.params;

      const batch = await deps.store.loadBatch(batchId);
      if (!batch) {
        return reply.code(404).send({ error: "batch_not_found" });
      }

      if (!isFullyResolved(batch)) {
        return reply.code(409).send({
          error: "batch_not_fully_resolved",
          message: "El lote debe tener todos los campos y FA resueltos antes de preparar el alta.",
        });
      }

      const planResult =
        deps.writeToolsEnabled && deps.writeClient
          ? await deps.writeClient.planWrite(batchId, batch)
          : buildLocalWritePlanResult(batch);

      const plan: WritePlan = {
        planId: planResult.planId,
        statements: planResult.statements,
        affectedRows: planResult.affectedRows,
        expiresAt: planResult.expiresAt,
        status: WRITE_PLAN_STATUS.AWAITING_CONFIRMATION,
      };
      await deps.store.savePlan(batchId, plan);

      return reply.code(200).send({ plan });
    },
  );

  app.post<{ Params: { batchId: string } }>(
    "/api/batches/:batchId/write-commit",
    async (request, reply) => {
      const parsed = commitBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "invalid_commit_body",
          issues: parsed.error.issues,
        });
      }

      const { batchId } = request.params;
      const { planId } = parsed.data;

      try {
        // Also records the confirmation attempt as a local audit row
        // (design.md sequence: "API->>DB: record the confirmation attempt").
        await deps.store.recordConfirmation(batchId, planId);
      } catch (error) {
        if (error instanceof PlanConfirmationError) {
          return reply
            .code(planConfirmationErrorStatus(error.kind))
            .send({ error: error.kind, message: error.message });
        }
        throw error;
      }

      if (deps.writeToolsEnabled && deps.writeClient?.commitWrite) {
        await deps.writeClient.commitWrite(batchId, planId);
        return reply.code(200).send({ committed: true });
      }

      // yhat_write_codes {mode:"commit"} — NOT SENT (design.md sequence).
      return reply.code(501).send({
        error: "write_tools_unavailable",
        message: WRITE_TOOLS_UNAVAILABLE_MESSAGE,
      });
    },
  );
}

function isFullyResolved(batch: BatchAnalysis): boolean {
  return batch.codes.every((code) => {
    const fieldsResolved = Object.values(code.fields).every((field) => field.status === "resolved");
    const faResolved = code.fa.length > 0 && code.fa.every((fa) => fa.status === "resolved");
    return fieldsResolved && faResolved;
  });
}

/**
 * Wraps the pure production-parity SQL preview from `domain/build-write-plan`
 * (issue #18) with the time/random-bound `WriteToolPlanResult` envelope
 * `store.savePlan` expects (planId + expiresAt). The SQL statements
 * themselves are still pure domain output; only the envelope is built here.
 */
function buildLocalWritePlanResult(batch: BatchAnalysis): WriteToolPlanResult {
  const { statements, affectedRows } = buildLocalWritePlan(batch);
  return {
    planId: randomUUID(),
    statements,
    affectedRows,
    expiresAt: new Date(Date.now() + LOCAL_PLAN_TTL_MS).toISOString(),
  };
}

function planConfirmationErrorStatus(kind: PlanConfirmationError["kind"]): number {
  switch (kind) {
    case PLAN_CONFIRMATION_ERROR_KIND.NO_PLAN:
      return 404;
    case PLAN_CONFIRMATION_ERROR_KIND.PLAN_ID_MISMATCH:
      return 409;
    case PLAN_CONFIRMATION_ERROR_KIND.PLAN_EXPIRED:
      return 410;
  }
}
