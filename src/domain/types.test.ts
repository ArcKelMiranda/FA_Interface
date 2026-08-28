import { describe, expect, it } from "vitest";
import legacyPasteBatch from "./__fixtures__/legacy-paste-batch.json";
import liveBatch from "./__fixtures__/live-batch.json";
import { batchAnalysisSchema, CONTRACT_VERSION } from "./types.js";

describe("batchAnalysisSchema", () => {
  it("round-trips the legacy paste-JSON contract, defaulting contractVersion", () => {
    const result = batchAnalysisSchema.safeParse(legacyPasteBatch);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.contractVersion).toBe(CONTRACT_VERSION);
    expect(result.data.batchNo).toBe(5);
    expect(result.data.codes).toHaveLength(1);
    expect(result.data.codes[0]?.fields.office.status).toBe("resolved");
    expect(result.data.codes[0]?.fa[0]?.state).toBe("existente");
  });

  it("round-trips a live resolver batch, preserving its explicit contractVersion", () => {
    const result = batchAnalysisSchema.safeParse(liveBatch);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.contractVersion).toBe("2.0.0");
    expect(result.data.batchNo).toBe(12);
    expect(result.data.codes[0]?.dupcheck).toBe("existente");
    expect(result.data.codes[0]?.fa[0]?.state).toBe("nuevo");
  });

  it("rejects a batch missing the required codes array", () => {
    const result = batchAnalysisSchema.safeParse({ batchNo: 1, snapshot: "2026-01-01" });
    expect(result.success).toBe(false);
  });
});
