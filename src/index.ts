/**
 * Server entry point. Boots the Fastify API (src/api/) wired to the real
 * MCP read client (src/mcp/yhat-client.ts) and the durable review-state
 * store (src/store/sqlite/index.ts). This is what `node dist/index.js`
 * (the Dockerfile CMD) and `npm start` invoke in production; `npm run dev`
 * uses `tsx watch src/index.ts` for the same boot with hot reload.
 *
 * Issue #16 — replaces the Phase-1 console.log scaffold with the real
 * boot. `boot()` is the testable seam: it constructs every adapter from
 * `process.env`, hands them to `buildApp`, and returns a `BootResult` that
 * the module-level `main()` then starts listening on. The smoke test
 * (`src/index.test.ts`) calls `boot()` directly and never calls
 * `app.listen()`, so it verifies adapter construction without binding to
 * a real port.
 *
 * ENV (see env.example for the full contract):
 *   - PORT:                       listen port (default 8080).
 *   - WRITE_TOOLS_ENABLED:        "true" to gate write-plan behind
 *                                 WriteToolClient (issue #17 — currently
 *                                 always "false"; the seam below throws
 *                                 until the MCP write tool ships).
 *   - REVIEW_STATE_DB_PATH:       SQLite file path (default
 *                                 `/data/review-state.db` in production,
 *                                 `./review-state.db` otherwise — matches
 *                                 the compose `facodes-data:/data` volume).
 *   - YHAT_INTERNAL_HOST / ...:   delegated to `resolveYhatMcpClientConfig`
 *                                 (raises YhatMcpConfigError if missing).
 */

import { pathToFileURL } from "node:url";

import { buildApp, type BuildAppDeps } from "./api/app.js";
import { resolveApiConfig } from "./api/config.js";
import type { WriteToolClient } from "./api/routes/write.js";
import {
  resolveYhatMcpClientConfig,
  YhatMcpClient,
} from "./mcp/yhat-client.js";
import { SqliteReviewStateStore } from "./store/sqlite/index.js";

/** Subset of `NodeJS.ProcessEnv` consulted by `boot()`. */
export interface BootEnv {
  NODE_ENV?: string;
  PORT?: string;
  WRITE_TOOLS_ENABLED?: string;
  REVIEW_STATE_DB_PATH?: string;
  YHAT_INTERNAL_HOST?: string;
  YHAT_INTERNAL_IDENTITY?: string;
  YHAT_MCP_URL?: string;
  YHAT_MCP_TIMEOUT_MS?: string;
  YHAT_MCP_MAX_ATTEMPTS?: string;
}

/** Normalized boot settings echoed in the startup log. */
export interface BootConfig {
  port: number;
  host: string;
  writeToolsEnabled: boolean;
  dbPath: string;
  mode: "production" | "development";
}

/** What `boot()` returns. `close()` is the graceful-shutdown primitive. */
export interface BootResult {
  app: ReturnType<typeof buildApp>;
  deps: BuildAppDeps;
  config: BootConfig;
  close: () => Promise<void>;
}

const NOT_IMPLEMENTED_ERROR_MESSAGE =
  "Write tools are not yet enabled — see issue #17 (yhat-mcp-server has no write tool yet).";

function resolveBootConfig(env: BootEnv): BootConfig {
  const apiConfig = resolveApiConfig(env);
  const mode = env.NODE_ENV === "production" ? "production" : "development";
  const dbPath =
    env.REVIEW_STATE_DB_PATH ??
    (mode === "production" ? "/data/review-state.db" : "./review-state.db");
  return {
    port: Number(env.PORT ?? 8080),
    host: "0.0.0.0",
    writeToolsEnabled: apiConfig.writeToolsEnabled,
    dbPath,
    mode,
  };
}

/**
 * Build the Fastify app + every adapter from `env`. Pure construction —
 * does NOT call `app.listen()`. Callers (the module-level `main()` and
 * the smoke test) decide when to bind to a port.
 *
 * Throws if `env` is missing required MCP config (delegated to
 * `resolveYhatMcpClientConfig`). The thrown `YhatMcpConfigError` is the
 * fast-fail signal callers should map to a non-zero exit.
 */
export function boot(env: BootEnv = process.env): BootResult {
  const mcpConfig = resolveYhatMcpClientConfig(env);
  const readPort = new YhatMcpClient(mcpConfig);

  const config = resolveBootConfig(env);
  const store = new SqliteReviewStateStore(config.dbPath);

  // WRITE_TOOLS_ENABLED seam — see WriteToolClient JSDoc (src/api/routes/write.ts).
  // Throws "not implemented" until yhat-mcp-server ships its write tool
  // (task 8.4). With WRITE_TOOLS_ENABLED=false (the default until then),
  // the write routes short-circuit before this stub is ever called
  // (design.md Migration/Rollout).
  const writeClient: WriteToolClient = {
    planWrite: () => Promise.reject(new Error(NOT_IMPLEMENTED_ERROR_MESSAGE)),
    commitWrite: () => Promise.reject(new Error(NOT_IMPLEMENTED_ERROR_MESSAGE)),
  };

  const app = buildApp({
    readPort,
    store,
    config: { writeToolsEnabled: config.writeToolsEnabled },
    writeClient,
  });

  // Liveness probe — no MCP call, no DB read, just "the Fastify server is
  // up". Matches the issue #16 acceptance (d) smoke-test shape
  // (`curl http://localhost:<port>/health`); docker-compose's own
  // healthcheck uses a TCP socket probe so it does not require this
  // endpoint, but keeping a real HTTP probe makes local `npm start`
  // verification straightforward.
  app.get("/health", async () => ({ status: "ok" }));

  return {
    app,
    deps: { readPort, store, config: { writeToolsEnabled: config.writeToolsEnabled }, writeClient },
    config,
    close: async () => {
      await app.close();
      store.close();
      await readPort.close();
    },
  };
}

async function main(): Promise<void> {
  const result = boot(process.env);
  await result.app.listen({ port: result.config.port, host: result.config.host });
  console.log(
    `facodes listening on :${result.config.port} (mode=${result.config.mode}, WRITE_TOOLS_ENABLED=${result.config.writeToolsEnabled}, db=${result.config.dbPath})`,
  );

  for (const sig of ["SIGTERM", "SIGINT"] as const) {
    process.on(sig, async () => {
      console.log(`${sig} received, shutting down gracefully`);
      try {
        await result.close();
      } catch (err) {
        console.error("error during shutdown", err);
      } finally {
        process.exit(0);
      }
    });
  }
}

// Only run main() when this module is the program entrypoint (i.e.
// `node dist/index.js` or `tsx src/index.ts`), never when vitest imports
// it to exercise `boot()`. ESM has no `require.main === module`; compare
// `import.meta.url` to `process.argv[1]` after normalising the latter to
// a file URL (handles Windows backslash separators and absolute paths).
const entryUrl = (() => {
  const entry = process.argv[1];
  if (!entry) return undefined;
  try {
    return pathToFileURL(entry).href;
  } catch {
    return undefined;
  }
})();

if (entryUrl !== undefined && import.meta.url === entryUrl) {
  main().catch((err) => {
    console.error("facodes failed to start:", err);
    process.exit(1);
  });
}
