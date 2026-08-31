import { afterEach, describe, expect, it } from "vitest";

import { YHAT_MCP_ERROR_KIND } from "./errors.js";
import { startStubMcpServer, type StubMcpServer } from "./__fixtures__/stub-mcp-server.js";
import { YhatMcpClient } from "./yhat-client.js";

let server: StubMcpServer | undefined;

afterEach(async () => {
  if (server) {
    await server.close();
    server = undefined;
  }
});

function makeClient(mcpUrl: string, overrides: Partial<{ requestTimeoutMs: number; maxAttempts: number }> = {}) {
  return new YhatMcpClient({
    mcpUrl,
    internalHost: "127.0.0.1",
    internalIdentity: "test-identity",
    requestTimeoutMs: overrides.requestTimeoutMs ?? 2000,
    maxAttempts: overrides.maxAttempts ?? 1,
    retryDelayMs: 10,
  });
}

describe("YhatMcpClient integration (spec mcp-client, stubbed /mcp)", () => {
  it("success: returns live rows from a successful yhat_query_entities call", async () => {
    server = await startStubMcpServer({
      onToolCall: () => ({
        kind: "success",
        rows: [{ Id: 1, BranchRep: "1234-5678" }],
      }),
    });

    const client = makeClient(server.url);
    const rows = await client.queryEntities({ entity: "Codes" });

    expect(rows).toEqual([{ Id: 1, BranchRep: "1234-5678" }]);
  });

  it("sends the configured x-yhat-internal-identity header on every call", async () => {
    server = await startStubMcpServer({
      onToolCall: () => ({ kind: "success", rows: [] }),
    });

    const client = makeClient(server.url);
    await client.queryEntities({ entity: "Codes" });

    expect(
      server.receivedHeaders.some(
        (headers) => headers["x-yhat-internal-identity"] === "test-identity",
      ),
    ).toBe(true);
  });

  it("error: a tool-level error response is surfaced as kind:tool_error, never partial rows", async () => {
    server = await startStubMcpServer({
      onToolCall: () => ({ kind: "tool_error", message: "Unknown entity: Bogus" }),
    });

    const client = makeClient(server.url);

    await expect(client.queryEntities({ entity: "Bogus" })).rejects.toMatchObject({
      kind: YHAT_MCP_ERROR_KIND.TOOL_ERROR,
    });
  });

  it("empty-result: a successful call with zero rows resolves to [] without throwing (spec — Explicit Empty-State Rendering)", async () => {
    server = await startStubMcpServer({
      onToolCall: () => ({ kind: "success", rows: [] }),
    });

    const client = makeClient(server.url);
    const rows = await client.queryEntities({ entity: "Codes" });

    expect(rows).toEqual([]);
  });

  it("timeout: a hung tool call is bounded by the configured timeout, never indefinite (spec — Read Failure Blocks the Affected Batch)", async () => {
    server = await startStubMcpServer({
      onToolCall: () => ({ kind: "hang" }),
    });

    const client = makeClient(server.url, { requestTimeoutMs: 150, maxAttempts: 1 });

    const startedAt = Date.now();
    await expect(client.queryEntities({ entity: "Codes" })).rejects.toMatchObject({
      kind: YHAT_MCP_ERROR_KIND.TIMEOUT,
    });
    const elapsedMs = Date.now() - startedAt;

    // Bounded — well under a "the UI could look like it's loading forever" scale.
    expect(elapsedMs).toBeLessThan(5000);
  }, 10_000);

  it("auth: a wrong internal-identity value is surfaced as kind:auth, not silently retried into success", async () => {
    server = await startStubMcpServer({
      requiredIdentity: "the-real-identity",
      onToolCall: () => ({ kind: "success", rows: [] }),
    });

    const client = new YhatMcpClient({
      mcpUrl: server.url,
      internalHost: "127.0.0.1",
      internalIdentity: "wrong-identity",
      requestTimeoutMs: 2000,
      maxAttempts: 1,
      retryDelayMs: 10,
    });

    await expect(client.queryEntities({ entity: "Codes" })).rejects.toMatchObject({
      kind: YHAT_MCP_ERROR_KIND.AUTH,
    });
  });
});
