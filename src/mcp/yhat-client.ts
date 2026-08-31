/**
 * `yhat-mcp-server` MCP client adapter — implements `YhatReadPort` over
 * Streamable HTTP (design.md System Architecture, Decision 3; spec
 * mcp-client — Internal-Identity Authentication, Read Failure Blocks the
 * Affected Batch, Explicit Empty-State Rendering). Sends
 * `x-yhat-internal-identity` on every call, validates the target host
 * against `YHAT_INTERNAL_HOST` before ever connecting, and bounds every
 * call with a timeout + small retry budget so a caller can never be left
 * in an indefinite loading state.
 *
 * SECURITY BOUNDARY (design.md Threat Matrix): this client only ever calls
 * the entity-query tool named by `QUERY_ENTITIES_TOOL_NAME`. The raw-SQL
 * admin tool is deliberately never referenced here or anywhere else in
 * UI-facing code — see `admin-tool-boundary.test.ts`.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

import type { EntityQuery, YhatReadPort } from "../ports/YhatReadPort.js";
import { entityQueryResponseSchema, entityQuerySchema } from "./entity-query.js";
import { YHAT_MCP_ERROR_KIND, YhatMcpConfigError, YhatMcpReadError } from "./errors.js";

const IDENTITY_HEADER = "x-yhat-internal-identity";

/** The only MCP tool this client is ever allowed to call. */
export const QUERY_ENTITIES_TOOL_NAME = "yhat_query_entities" as const;

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 200;

export interface YhatMcpClientConfig {
  mcpUrl: string;
  internalHost: string;
  internalIdentity: string;
  requestTimeoutMs: number;
  maxAttempts: number;
  retryDelayMs: number;
  /** Test seam — a custom fetch implementation for the underlying transport. */
  fetch?: typeof fetch;
}

export interface YhatMcpClientEnv {
  YHAT_INTERNAL_HOST?: string;
  YHAT_INTERNAL_IDENTITY?: string;
  YHAT_MCP_URL?: string;
  YHAT_MCP_TIMEOUT_MS?: string;
  YHAT_MCP_MAX_ATTEMPTS?: string;
}

export function normalizeHost(host: string): string {
  const trimmed = host.trim().toLowerCase();
  // Only strip a trailing ":<port>" for single-colon hosts — an IPv6
  // literal like "::1" has multiple colons and no attached port here.
  const colonCount = (trimmed.match(/:/g) ?? []).length;
  return colonCount === 1 ? trimmed.replace(/:\d+$/, "") : trimmed;
}

/**
 * Client-side Host allowlist (spec mcp-client — Internal-Identity
 * Authentication). Mirrors yhat-mcp-server's own `authorizeInternalMcpRequest`
 * loopback/configured-host rule, so a misconfigured `YHAT_MCP_URL` fails
 * fast in facodes rather than leaking the internal-identity credential to
 * an unrelated host.
 */
export function isAllowedTargetHost(
  urlHost: string,
  configuredInternalHost: string,
): boolean {
  const normalized = normalizeHost(urlHost);
  const configured = normalizeHost(configuredInternalHost);
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === configured
  );
}

export function resolveYhatMcpClientConfig(
  env: YhatMcpClientEnv = process.env,
): YhatMcpClientConfig {
  const internalHost = env.YHAT_INTERNAL_HOST?.trim();
  if (!internalHost) {
    throw new YhatMcpConfigError("YHAT_INTERNAL_HOST is required");
  }

  const internalIdentity = env.YHAT_INTERNAL_IDENTITY?.trim();
  if (!internalIdentity) {
    throw new YhatMcpConfigError("YHAT_INTERNAL_IDENTITY is required");
  }

  const mcpUrl = env.YHAT_MCP_URL?.trim() || `https://${internalHost}/mcp`;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(mcpUrl);
  } catch {
    throw new YhatMcpConfigError(`YHAT_MCP_URL is not a valid URL: ${mcpUrl}`);
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new YhatMcpConfigError(
      `YHAT_MCP_URL must use http or https, got: ${parsedUrl.protocol}`,
    );
  }

  if (!isAllowedTargetHost(parsedUrl.hostname, internalHost)) {
    throw new YhatMcpConfigError(
      `YHAT_MCP_URL host "${parsedUrl.hostname}" is not allowed for YHAT_INTERNAL_HOST="${internalHost}"`,
    );
  }

  const requestTimeoutMs = env.YHAT_MCP_TIMEOUT_MS
    ? Number(env.YHAT_MCP_TIMEOUT_MS)
    : DEFAULT_REQUEST_TIMEOUT_MS;

  const maxAttempts = env.YHAT_MCP_MAX_ATTEMPTS
    ? Number(env.YHAT_MCP_MAX_ATTEMPTS)
    : DEFAULT_MAX_ATTEMPTS;

  return {
    mcpUrl,
    internalHost,
    internalIdentity,
    requestTimeoutMs,
    maxAttempts,
    retryDelayMs: DEFAULT_RETRY_DELAY_MS,
  };
}

export class YhatMcpClient implements YhatReadPort {
  private readonly config: YhatMcpClientConfig;
  private client: Client | undefined;
  private connecting: Promise<Client> | undefined;

  constructor(config: YhatMcpClientConfig) {
    this.config = config;
  }

  async queryEntities(query: EntityQuery): Promise<Record<string, unknown>[]> {
    const parsed = entityQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new YhatMcpReadError(
        YHAT_MCP_ERROR_KIND.INVALID_REQUEST,
        `Invalid entity query: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
        parsed.error,
      );
    }

    return this.withRetries(() => this.callQueryEntities(parsed.data));
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
    this.client = undefined;
    this.connecting = undefined;
  }

  private async connect(): Promise<Client> {
    if (this.client) return this.client;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      const transport = new StreamableHTTPClientTransport(new URL(this.config.mcpUrl), {
        requestInit: {
          headers: { [IDENTITY_HEADER]: this.config.internalIdentity },
        },
        ...(this.config.fetch ? { fetch: this.config.fetch } : {}),
      });

      const client = new Client({ name: "facodes", version: "0.1.0" });
      // The SDK's own StreamableHTTPClientTransport class does not satisfy
      // its own `Transport` interface under `exactOptionalPropertyTypes`
      // (its `sessionId` getter returns `string | undefined`, while
      // `Transport.sessionId` is declared as an absent-or-string optional
      // property) -- a known friction point between this strict tsconfig
      // setting and the SDK's own types, not a real behavioral mismatch.
      await client.connect(transport as Parameters<Client["connect"]>[0], {
        timeout: this.config.requestTimeoutMs,
      });
      this.client = client;
      return client;
    })();

    try {
      return await this.connecting;
    } catch (error) {
      this.connecting = undefined;
      throw mapTransportError(error);
    }
  }

  private async callQueryEntities(
    query: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    const client = await this.connect();

    let rawResult: unknown;
    try {
      rawResult = await client.callTool(
        { name: QUERY_ENTITIES_TOOL_NAME, arguments: query },
        undefined,
        { timeout: this.config.requestTimeoutMs },
      );
    } catch (error) {
      throw mapTransportError(error);
    }

    if (!isCallToolResult(rawResult)) {
      throw new YhatMcpReadError(
        YHAT_MCP_ERROR_KIND.INVALID_RESPONSE,
        "yhat_query_entities returned an unexpected result shape",
      );
    }

    const result = rawResult;

    if (result.isError) {
      const message =
        extractText(result.content) ?? "yhat_query_entities returned an error";
      throw new YhatMcpReadError(YHAT_MCP_ERROR_KIND.TOOL_ERROR, message);
    }

    const text = extractText(result.content);
    if (text === undefined) {
      throw new YhatMcpReadError(
        YHAT_MCP_ERROR_KIND.INVALID_RESPONSE,
        "yhat_query_entities returned no text content",
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      throw new YhatMcpReadError(
        YHAT_MCP_ERROR_KIND.INVALID_RESPONSE,
        "yhat_query_entities returned non-JSON content",
        error,
      );
    }

    const parsedResponse = entityQueryResponseSchema.safeParse(payload);
    if (!parsedResponse.success) {
      throw new YhatMcpReadError(
        YHAT_MCP_ERROR_KIND.INVALID_RESPONSE,
        `yhat_query_entities response did not match the expected shape: ${parsedResponse.error.issues.map((issue) => issue.message).join("; ")}`,
        parsedResponse.error,
      );
    }

    return parsedResponse.data.rows;
  }

  private async withRetries<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const retryable =
          error instanceof YhatMcpReadError &&
          (error.kind === YHAT_MCP_ERROR_KIND.TIMEOUT ||
            error.kind === YHAT_MCP_ERROR_KIND.NETWORK);
        if (!retryable || attempt === this.config.maxAttempts) {
          throw error;
        }
        await delay(this.config.retryDelayMs);
      }
    }
    throw lastError;
  }
}

interface CallToolTextResult {
  content: readonly { type: string; text?: string }[];
  isError?: boolean;
}

/**
 * Narrows the MCP SDK's own loosely-typed `callTool` return value (a union
 * that TS cannot always resolve cleanly against `exactOptionalPropertyTypes`)
 * into the one shape this client trusts. Anything else becomes a
 * `invalid_response` error rather than an unsafe property access.
 */
function isCallToolResult(value: unknown): value is CallToolTextResult {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { content?: unknown }).content)
  );
}

function extractText(
  content: readonly { type: string; text?: string }[],
): string | undefined {
  const first = content.find((item) => item.type === "text");
  return first?.text;
}

function mapTransportError(error: unknown): YhatMcpReadError {
  if (error instanceof YhatMcpReadError) return error;

  if (error instanceof McpError) {
    if (error.code === ErrorCode.RequestTimeout) {
      return new YhatMcpReadError(
        YHAT_MCP_ERROR_KIND.TIMEOUT,
        "yhat-mcp-server request timed out",
        error,
      );
    }
    return new YhatMcpReadError(YHAT_MCP_ERROR_KIND.NETWORK, error.message, error);
  }

  if (error instanceof StreamableHTTPError) {
    if (error.code === 401 || error.code === 403) {
      return new YhatMcpReadError(YHAT_MCP_ERROR_KIND.AUTH, error.message, error);
    }
    return new YhatMcpReadError(YHAT_MCP_ERROR_KIND.NETWORK, error.message, error);
  }

  const message = error instanceof Error ? error.message : String(error);
  return new YhatMcpReadError(YHAT_MCP_ERROR_KIND.NETWORK, message, error);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
