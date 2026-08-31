/**
 * Fastify app factory (task 5.7) — wires `YhatReadPort`, `ReviewStateStore`,
 * and the `WRITE_TOOLS_ENABLED` flag from `resolveApiConfig` into the two
 * route plugins created for Phase 5 (design.md File Changes:
 * `src/api/routes/{batches,write}.ts`).
 *
 * `src/index.ts` boots the real server (MCP client + SQLite store + real
 * env); this factory exists so route wiring is independently testable via
 * `fastify.inject` without a real MCP server or database file.
 */

import Fastify, { type FastifyInstance } from "fastify";

import type { ReviewStateStore } from "../ports/ReviewStateStore.js";
import type { YhatReadPort } from "../ports/YhatReadPort.js";
import { resolveApiConfig, type ApiConfig } from "./config.js";
import { registerBatchesRoutes } from "./routes/batches.js";
import { registerWriteRoutes, type WriteToolClient } from "./routes/write.js";

export interface BuildAppDeps {
  readPort: YhatReadPort;
  store: ReviewStateStore;
  /** Defaults to `resolveApiConfig()` (reads `process.env.WRITE_TOOLS_ENABLED`). */
  config?: ApiConfig;
  /** Only consulted when `config.writeToolsEnabled` is true (see write.ts). */
  writeClient?: WriteToolClient;
}

export function buildApp(deps: BuildAppDeps): FastifyInstance {
  const app = Fastify();
  const config = deps.config ?? resolveApiConfig();

  registerBatchesRoutes(app, { readPort: deps.readPort, store: deps.store });
  registerWriteRoutes(app, {
    store: deps.store,
    writeToolsEnabled: config.writeToolsEnabled,
    ...(deps.writeClient ? { writeClient: deps.writeClient } : {}),
  });

  return app;
}
