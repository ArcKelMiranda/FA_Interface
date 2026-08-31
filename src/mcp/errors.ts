/**
 * Error taxonomy for `YhatMcpClient` (spec mcp-client — Read Failure Blocks
 * the Affected Batch). Every failure mode the client can produce collapses
 * into one of these kinds so callers can render a single blocking error
 * state without inspecting MCP/HTTP transport internals.
 */

export const YHAT_MCP_ERROR_KIND = {
  /** Rejected client-side, before any wire call was made. */
  INVALID_REQUEST: "invalid_request",
  /** A bounded wait elapsed without a response. */
  TIMEOUT: "timeout",
  /** Connection-level failure (refused, DNS, transport-level HTTP error). */
  NETWORK: "network",
  /** The internal-identity/host gate rejected the request (401/403). */
  AUTH: "auth",
  /** The server executed the tool and reported `isError: true`. */
  TOOL_ERROR: "tool_error",
  /** The response did not match the documented contract shape. */
  INVALID_RESPONSE: "invalid_response",
} as const;

export type YhatMcpErrorKind =
  (typeof YHAT_MCP_ERROR_KIND)[keyof typeof YHAT_MCP_ERROR_KIND];

export class YhatMcpReadError extends Error {
  readonly kind: YhatMcpErrorKind;

  constructor(kind: YhatMcpErrorKind, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "YhatMcpReadError";
    this.kind = kind;
  }
}

/** Thrown by `resolveYhatMcpClientConfig` for missing/unsafe configuration. */
export class YhatMcpConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YhatMcpConfigError";
  }
}
