/**
 * Minimal Streamable-HTTP MCP server stub for integration tests (spec
 * mcp-client — Explicit Empty-State Rendering, Read Failure Blocks the
 * Affected Batch, Internal-Identity Authentication). Implements just enough
 * of the MCP HTTP transport (initialize handshake + `tools/call`) to drive
 * `YhatMcpClient` through success, tool-error, empty-result, timeout, and
 * auth-rejection paths without depending on a real yhat-mcp-server
 * instance.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export type StubToolCallOutcome =
  | { kind: "success"; rows: Record<string, unknown>[] }
  | { kind: "tool_error"; message: string }
  | { kind: "hang" };

export interface StubMcpServerOptions {
  onToolCall: (name: string, args: unknown) => StubToolCallOutcome;
  /** When set, every POST must carry this exact `x-yhat-internal-identity` value or gets a 401. */
  requiredIdentity?: string;
}

export interface StubMcpServer {
  url: string;
  receivedHeaders: Record<string, string | string[] | undefined>[];
  close(): Promise<void>;
}

interface JsonRpcRequestBody {
  jsonrpc: "2.0";
  id?: number | string;
  method: string;
  params?: Record<string, unknown>;
}

export async function startStubMcpServer(
  options: StubMcpServerOptions,
): Promise<StubMcpServer> {
  const receivedHeaders: Record<string, string | string[] | undefined>[] = [];

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST") {
      res.writeHead(405).end();
      return;
    }

    receivedHeaders.push({ ...req.headers });

    if (
      options.requiredIdentity !== undefined &&
      req.headers["x-yhat-internal-identity"] !== options.requiredIdentity
    ) {
      res.writeHead(401).end();
      return;
    }

    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const body = JSON.parse(
        Buffer.concat(chunks).toString("utf8"),
      ) as JsonRpcRequestBody;
      handleJsonRpc(body, res, options);
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${address.port}/mcp`,
    receivedHeaders,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  };
}

function handleJsonRpc(
  body: JsonRpcRequestBody,
  res: ServerResponse,
  options: StubMcpServerOptions,
): void {
  if (body.method === "initialize") {
    respondJson(res, {
      jsonrpc: "2.0",
      id: body.id,
      result: {
        protocolVersion: (body.params?.["protocolVersion"] as string) ?? "2025-06-18",
        capabilities: {},
        serverInfo: { name: "stub-yhat-mcp-server", version: "0.0.0" },
      },
    });
    return;
  }

  if (body.method === "notifications/initialized") {
    res.writeHead(202).end();
    return;
  }

  if (body.method === "tools/call") {
    const toolName = body.params?.["name"] as string;
    const toolArgs = body.params?.["arguments"];
    const outcome = options.onToolCall(toolName, toolArgs);

    if (outcome.kind === "hang") {
      // Never respond — proves the client's own bounded timeout, not a
      // server-provided response, is what ends the call.
      return;
    }

    if (outcome.kind === "tool_error") {
      respondJson(res, {
        jsonrpc: "2.0",
        id: body.id,
        result: {
          content: [{ type: "text", text: outcome.message }],
          isError: true,
        },
      });
      return;
    }

    const entity = (toolArgs as { entity?: string } | undefined)?.entity ?? "unknown";
    const payload = {
      entity,
      rowCount: outcome.rows.length,
      rows: outcome.rows,
    };

    respondJson(res, {
      jsonrpc: "2.0",
      id: body.id,
      result: {
        content: [{ type: "text", text: JSON.stringify(payload) }],
      },
    });
    return;
  }

  res.writeHead(400).end();
}

function respondJson(res: ServerResponse, body: unknown): void {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}
