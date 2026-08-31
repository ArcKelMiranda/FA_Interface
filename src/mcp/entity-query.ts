/**
 * Entity-query contract shared between `YhatReadPort.queryEntities` callers
 * and `src/mcp/yhat-client.ts` (design.md Interfaces/Contracts; design.md
 * Threat Matrix boundary; spec mcp-client). Mirrors yhat-mcp-server's own
 * `entityQueryInputSchema` (sibling repo `src/server.ts`) so a malformed
 * query is rejected client-side before it ever reaches the wire.
 */

import { z } from "zod";

export const entityQueryFilterSchema = z.object({
  attribute: z.string().min(1, { error: "attribute is required" }),
  operator: z.enum(["=", "!=", "<", ">", "<=", ">=", "LIKE", "IN"]),
  value: z.unknown(),
});

export const entityQueryOrderBySchema = z.object({
  attribute: z.string().min(1, { error: "attribute is required" }),
  direction: z.enum(["ASC", "DESC"]),
});

export const entityQuerySchema = z.object({
  entity: z.string().min(1, { error: "entity is required" }),
  attributes: z.array(z.string()).optional(),
  filters: z.array(entityQueryFilterSchema).optional(),
  joins: z.array(z.string()).optional(),
  orderBy: entityQueryOrderBySchema.optional(),
  limit: z.number().int().positive().max(10000).optional(),
});

export type ValidatedEntityQuery = z.infer<typeof entityQuerySchema>;

/**
 * The `yhat_query_entities` response payload shape (sibling repo
 * `src/server.ts` `QueryResponsePayload`), validated before facodes ever
 * trusts a row out of it.
 */
export const entityQueryResponseSchema = z.object({
  entity: z.string(),
  semanticModelVersion: z.string().optional(),
  queriedAt: z.string().optional(),
  rowCount: z.number().optional(),
  limit: z.number().optional(),
  mayBeTruncated: z.boolean().optional(),
  rows: z.array(z.record(z.string(), z.unknown())),
  warning: z.string().optional(),
});

export type EntityQueryResponse = z.infer<typeof entityQueryResponseSchema>;
