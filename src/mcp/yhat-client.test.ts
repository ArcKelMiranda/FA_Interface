import { describe, expect, it, vi } from "vitest";

import { YHAT_MCP_ERROR_KIND, YhatMcpConfigError, YhatMcpReadError } from "./errors.js";
import {
  isAllowedTargetHost,
  resolveYhatMcpClientConfig,
  YhatMcpClient,
} from "./yhat-client.js";

describe("resolveYhatMcpClientConfig (spec mcp-client — Internal-Identity Authentication)", () => {
  it("throws YhatMcpConfigError when YHAT_INTERNAL_HOST is missing", () => {
    expect(() =>
      resolveYhatMcpClientConfig({ YHAT_INTERNAL_IDENTITY: "secret" }),
    ).toThrow(YhatMcpConfigError);
  });

  it("throws YhatMcpConfigError when YHAT_INTERNAL_IDENTITY is missing", () => {
    expect(() =>
      resolveYhatMcpClientConfig({ YHAT_INTERNAL_HOST: "mcp.internal.yhat" }),
    ).toThrow(YhatMcpConfigError);
  });

  it("defaults YHAT_MCP_URL to https://<YHAT_INTERNAL_HOST>/mcp (Caddy-fronted production path)", () => {
    const config = resolveYhatMcpClientConfig({
      YHAT_INTERNAL_HOST: "mcp.internal.yhat",
      YHAT_INTERNAL_IDENTITY: "secret",
    });
    expect(config.mcpUrl).toBe("https://mcp.internal.yhat/mcp");
  });

  it("honors an explicit YHAT_MCP_URL override whose host matches YHAT_INTERNAL_HOST", () => {
    const config = resolveYhatMcpClientConfig({
      YHAT_INTERNAL_HOST: "yhat-mcp-server",
      YHAT_INTERNAL_IDENTITY: "secret",
      YHAT_MCP_URL: "http://yhat-mcp-server:3000/mcp",
    });
    expect(config.mcpUrl).toBe("http://yhat-mcp-server:3000/mcp");
  });

  it("throws YhatMcpConfigError when YHAT_MCP_URL points at a host outside the allowlist", () => {
    expect(() =>
      resolveYhatMcpClientConfig({
        YHAT_INTERNAL_HOST: "mcp.internal.yhat",
        YHAT_INTERNAL_IDENTITY: "secret",
        YHAT_MCP_URL: "https://evil.example.com/mcp",
      }),
    ).toThrow(YhatMcpConfigError);
  });

  it("allows loopback hosts for local dev regardless of the configured internal host", () => {
    const config = resolveYhatMcpClientConfig({
      YHAT_INTERNAL_HOST: "mcp.internal.yhat",
      YHAT_INTERNAL_IDENTITY: "secret",
      YHAT_MCP_URL: "http://127.0.0.1:3000/mcp",
    });
    expect(config.mcpUrl).toBe("http://127.0.0.1:3000/mcp");
  });

  it("rejects a non-http(s) protocol", () => {
    expect(() =>
      resolveYhatMcpClientConfig({
        YHAT_INTERNAL_HOST: "mcp.internal.yhat",
        YHAT_INTERNAL_IDENTITY: "secret",
        YHAT_MCP_URL: "file:///etc/passwd",
      }),
    ).toThrow(YhatMcpConfigError);
  });
});

describe("isAllowedTargetHost", () => {
  it("matches the configured internal host case-insensitively, ignoring port", () => {
    expect(isAllowedTargetHost("MCP.Internal.Yhat:8443", "mcp.internal.yhat")).toBe(true);
  });

  it("allows localhost/127.0.0.1/::1", () => {
    expect(isAllowedTargetHost("localhost", "mcp.internal.yhat")).toBe(true);
    expect(isAllowedTargetHost("127.0.0.1", "mcp.internal.yhat")).toBe(true);
    expect(isAllowedTargetHost("::1", "mcp.internal.yhat")).toBe(true);
  });

  it("rejects an unrelated host", () => {
    expect(isAllowedTargetHost("example.com", "mcp.internal.yhat")).toBe(false);
  });
});

describe("YhatMcpClient.queryEntities validation (spec mcp-client boundary; design.md Threat Matrix)", () => {
  it("rejects an invalid query before any network call is made", async () => {
    const fetchSpy = vi.fn();
    const client = new YhatMcpClient({
      mcpUrl: "http://127.0.0.1:9/mcp", // deliberately unreachable
      internalHost: "127.0.0.1",
      internalIdentity: "secret",
      requestTimeoutMs: 200,
      maxAttempts: 2,
      retryDelayMs: 10,
      fetch: fetchSpy as unknown as typeof fetch,
    });

    await expect(client.queryEntities({ entity: "" })).rejects.toMatchObject({
      kind: YHAT_MCP_ERROR_KIND.INVALID_REQUEST,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("wraps invalid input in a YhatMcpReadError instance", async () => {
    const client = new YhatMcpClient({
      mcpUrl: "http://127.0.0.1:9/mcp",
      internalHost: "127.0.0.1",
      internalIdentity: "secret",
      requestTimeoutMs: 200,
      maxAttempts: 1,
      retryDelayMs: 10,
    });

    await expect(client.queryEntities({ entity: "" })).rejects.toBeInstanceOf(
      YhatMcpReadError,
    );
  });
});

describe("YhatMcpClient retry-on-network-failure (spec mcp-client — Read Failure Blocks the Affected Batch)", () => {
  it("retries up to maxAttempts on connection failure and reports kind:network", async () => {
    const client = new YhatMcpClient({
      // Port 1 is reserved and refuses connections immediately on every OS.
      mcpUrl: "http://127.0.0.1:1/mcp",
      internalHost: "127.0.0.1",
      internalIdentity: "secret",
      requestTimeoutMs: 500,
      maxAttempts: 3,
      retryDelayMs: 5,
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(client.queryEntities({ entity: "Codes" })).rejects.toMatchObject({
      kind: YHAT_MCP_ERROR_KIND.NETWORK,
    });

    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
    fetchSpy.mockRestore();
  }, 10_000);
});
