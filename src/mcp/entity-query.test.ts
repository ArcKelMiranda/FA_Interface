import { describe, expect, it } from "vitest";

import { entityQueryResponseSchema, entityQuerySchema } from "./entity-query.js";

describe("entityQuerySchema", () => {
  it("accepts a minimal valid query", () => {
    const result = entityQuerySchema.safeParse({ entity: "Codes" });
    expect(result.success).toBe(true);
  });

  it("accepts a fully-populated query matching yhat-mcp-server's own schema", () => {
    const result = entityQuerySchema.safeParse({
      entity: "Codes",
      attributes: ["Id", "BranchRep"],
      filters: [{ attribute: "BranchRep", operator: "=", value: "1234-5678" }],
      joins: ["FA"],
      orderBy: { attribute: "Id", direction: "ASC" },
      limit: 500,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing entity", () => {
    const result = entityQuerySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects an unknown filter operator", () => {
    const result = entityQuerySchema.safeParse({
      entity: "Codes",
      filters: [{ attribute: "BranchRep", operator: "DROP TABLE", value: "x" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a limit above the server's hard cap of 10000", () => {
    const result = entityQuerySchema.safeParse({ entity: "Codes", limit: 10001 });
    expect(result.success).toBe(false);
  });
});

describe("entityQueryResponseSchema", () => {
  it("accepts a well-formed response payload", () => {
    const result = entityQueryResponseSchema.safeParse({
      entity: "Codes",
      rowCount: 1,
      rows: [{ Id: 1 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a payload missing rows", () => {
    const result = entityQueryResponseSchema.safeParse({ entity: "Codes" });
    expect(result.success).toBe(false);
  });
});
