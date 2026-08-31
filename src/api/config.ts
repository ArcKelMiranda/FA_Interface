/**
 * API-layer config resolution (task 5.7; design.md Migration/Rollout —
 * `WRITE_TOOLS_ENABLED`). Kept separate from `src/mcp/yhat-client.ts`'s own
 * env resolution — this flag governs the API layer's write-confirmation
 * gate, not the MCP read client's connection config.
 */

export interface ApiConfig {
  writeToolsEnabled: boolean;
}

export interface ApiConfigEnv {
  WRITE_TOOLS_ENABLED?: string;
}

export function resolveApiConfig(env: ApiConfigEnv = process.env): ApiConfig {
  return {
    writeToolsEnabled: env.WRITE_TOOLS_ENABLED === "true",
  };
}
