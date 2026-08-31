/**
 * `YhatReadPort` — driven port for live reads from `yhat-mcp-server` over
 * MCP (design.md Interfaces/Contracts). `src/mcp/yhat-client.ts` implements
 * this port; domain and API code depend only on this interface, never on
 * the MCP adapter directly.
 *
 * SECURITY BOUNDARY (design.md Threat Matrix): this port is the entire
 * surface UI-facing code may use to read live data. It intentionally has
 * no method mapping to `yhat_query` (raw SQL, admin-only) — see
 * `src/mcp/admin-tool-boundary.test.ts`.
 */

export interface EntityQueryFilter {
  attribute: string;
  operator: "=" | "!=" | "<" | ">" | "<=" | ">=" | "LIKE" | "IN";
  value: unknown;
}

export interface EntityQueryOrderBy {
  attribute: string;
  direction: "ASC" | "DESC";
}

export interface EntityQuery {
  entity: string;
  attributes?: string[];
  filters?: EntityQueryFilter[];
  joins?: string[];
  orderBy?: EntityQueryOrderBy;
  /** Server default is 1000; server-side hard cap is 10000. */
  limit?: number;
}

export interface YhatReadPort {
  queryEntities(query: EntityQuery): Promise<Record<string, unknown>[]>;
}
