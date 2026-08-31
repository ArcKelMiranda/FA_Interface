import { describe, expect, it } from "vitest";

import type { BatchAnalysis } from "./types.js";
import { buildLocalWritePlan } from "./build-write-plan.js";

function makeBatch(overrides: Partial<BatchAnalysis> = {}): BatchAnalysis {
  return {
    contractVersion: "1.0.0",
    batchNo: 42,
    snapshot: "2026-08-31T00:00:00.000Z",
    codes: [
      {
        id: "code-1",
        branchRep: "0001-0002",
        repName: "Jane Doe",
        dupcheck: "existente",
        fields: {
          office: { value: "NY", valueId: 100, status: "resolved" },
          country: { value: "US", valueId: 1, status: "resolved" },
          region: { value: "NE", valueId: 2, status: "resolved" },
          ibd: { value: "IBD1", valueId: 3, status: "resolved" },
          nscc: { value: "NSCC1", status: "resolved" },
          origin: { value: "PERSHING", valueId: 5, status: "resolved" },
          dealer: { value: "D1", valueId: 6, status: "resolved" },
          agente: { value: "A1", valueId: 7, status: "resolved" },
        },
        fa: [{ id: 1, name: "Some Fa", state: "existente", status: "resolved" }],
      },
    ],
    ...overrides,
  };
}

function getInsertCount(statements: string[]): number {
  return statements.filter((s) => /^\s*INSERT\s+INTO/i.test(s)).length;
}

describe("buildLocalWritePlan (PRD v5 §5.5 — full production-parity SQL preview)", () => {
  it("always begins with BEGIN TRAN and ends with commented COMMIT / ROLLBACK", () => {
    const statements = buildLocalWritePlan(makeBatch()).statements;

    expect(statements[0]).toBe("BEGIN TRAN;");
    expect(statements.at(-2)).toBe("-- COMMIT;");
    expect(statements.at(-1)).toBe("-- ROLLBACK;");
  });

  it("emits one INSERT INTO [Codes] per code, with inline comments showing the resolved names", () => {
    const statements = buildLocalWritePlan(makeBatch()).statements;

    const codesInserts = statements.filter((s) => /INSERT\s+INTO\s+\[Codes\]/i.test(s));
    expect(codesInserts).toHaveLength(1);
    expect(codesInserts[0]).toContain("VALUES");
    expect(codesInserts[0]).toContain("'code-1'");
    expect(codesInserts[0]).toContain("'0001-0002'");
    expect(codesInserts[0]).toContain("'Jane Doe'");
    // Catalog FK columns are emitted as bare numbers (valueId), not as the
    // display string. Office NY -> OfficeId 100.
    expect(codesInserts[0]).toMatch(/\(\s*42,\s*'code-1'/);

    // The resolved-name comment immediately follows the INSERT INTO [Codes]
    // statement and lists every one of the 8 fields.
    const codesInsertIndex = statements.indexOf(codesInserts[0]!);
    const inlineComment = statements[codesInsertIndex + 1]!;
    expect(inlineComment.startsWith("-- ")).toBe(true);
    expect(inlineComment).toContain("Office: NY");
    expect(inlineComment).toContain("Country: US");
    expect(inlineComment).toContain("Region: NE");
    expect(inlineComment).toContain("IBD: IBD1");
    expect(inlineComment).toContain("NSCC: NSCC1");
    expect(inlineComment).toContain("Origin: PERSHING");
    expect(inlineComment).toContain("Dealer: D1");
    expect(inlineComment).toContain("Agente: A1");
  });

  it("emits INSERT INTO [FAxCodes] for an existing FA without an INSERT INTO [FA]", () => {
    const statements = buildLocalWritePlan(makeBatch()).statements;

    const faInserts = statements.filter((s) => /INSERT\s+INTO\s+\[FA\]/i.test(s));
    const faXCodesInserts = statements.filter((s) => /INSERT\s+INTO\s+\[FAxCodes\]/i.test(s));

    expect(faInserts).toHaveLength(0);
    expect(faXCodesInserts).toHaveLength(1);
    expect(faXCodesInserts[0]).toContain("VALUES (1, 'code-1')");
  });

  it("emits both INSERT INTO [FA] and INSERT INTO [FAxCodes] for a new FA", () => {
    const batch = makeBatch();
    batch.codes[0]!.fa = [
      { id: 0, name: "Brand New Fa", state: "nuevo", status: "resolved", tipo: "Persona" },
    ];

    const statements = buildLocalWritePlan(batch).statements;

    const faInserts = statements.filter((s) => /INSERT\s+INTO\s+\[FA\]/i.test(s));
    const faXCodesInserts = statements.filter((s) => /INSERT\s+INTO\s+\[FAxCodes\]/i.test(s));

    expect(faInserts).toHaveLength(1);
    expect(faInserts[0]).toMatch(/INSERT\s+INTO\s+\[FA\][\s\S]*VALUES\s*\(\s*'Brand New Fa',\s*'Persona'\s*\)/i);

    // The FAxCodes insert for a new FA must reference the SCOPE_IDENTITY()
    // of the just-inserted FA row, not a hard-coded numeric id — this is
    // the production-parity mechanism that keeps the script correct under
    // multiple new FA inserts in the same BEGIN TRAN.
    expect(faXCodesInserts).toHaveLength(1);
    expect(faXCodesInserts[0]).toMatch(/SCOPE_IDENTITY\(\)/i);
    expect(faXCodesInserts[0]).toContain("'code-1'");
  });

  it("emits a single batched INSERT INTO [CodeOrigins] covering every code", () => {
    const batch = makeBatch();
    batch.codes.push({
      ...batch.codes[0]!,
      id: "code-2",
      branchRep: "0002-0003",
      repName: "John Smith",
    });

    const statements = buildLocalWritePlan(batch).statements;

    const codeOriginsInserts = statements.filter((s) =>
      /INSERT\s+INTO\s+\[CodeOrigins\]/i.test(s),
    );
    expect(codeOriginsInserts).toHaveLength(1);
    expect(codeOriginsInserts[0]).toContain("'code-1'");
    expect(codeOriginsInserts[0]).toContain("'code-2'");
    // OriginId is emitted as the catalog valueId, not the display string.
    expect(codeOriginsInserts[0]).toMatch(/\(\s*'code-1',\s*5\s*\)/);
    expect(codeOriginsInserts[0]).toMatch(/\(\s*'code-2',\s*5\s*\)/);
  });

  it("emits a verification SELECT joining Codes against Offices and Countries, filtered by BatchNo", () => {
    const statements = buildLocalWritePlan(makeBatch()).statements;

    const selectStatements = statements.filter((s) => /^\s*SELECT\b/i.test(s));
    expect(selectStatements).toHaveLength(1);

    const select = selectStatements[0]!;
    expect(select).toMatch(/FROM\s+\[Codes\]/i);
    expect(select).toMatch(/JOIN\s+\[Offices\]/i);
    expect(select).toMatch(/JOIN\s+\[Countries\]/i);
    expect(select).toMatch(/WHERE\s+(?:\w+\.)?\[BatchNo\]\s*=\s*42/);
  });

  it("handles a multi-code batch with mixed FA states — existing + new in the same script", () => {
    const batch = makeBatch();
    batch.codes.push({
      ...batch.codes[0]!,
      id: "code-2",
      branchRep: "0002-0003",
      repName: "John Smith",
      fa: [{ id: 0, name: "Other Fa", state: "nuevo", status: "resolved", tipo: "Empresa" }],
    });
    // code-1 keeps the existing FA (id=1) above; code-2 has a new FA.

    const statements = buildLocalWritePlan(batch).statements;

    const codesInserts = statements.filter((s) => /INSERT\s+INTO\s+\[Codes\]/i.test(s));
    expect(codesInserts).toHaveLength(2);

    const faInserts = statements.filter((s) => /INSERT\s+INTO\s+\[FA\]/i.test(s));
    const faXCodesInserts = statements.filter((s) => /INSERT\s+INTO\s+\[FAxCodes\]/i.test(s));

    // One new FA -> one INSERT INTO [FA], and two FAxCodes (one for each code's
    // resolved FA: existing for code-1, new for code-2 via SCOPE_IDENTITY()).
    expect(faInserts).toHaveLength(1);
    expect(faXCodesInserts).toHaveLength(2);
    expect(faXCodesInserts.some((s) => s.includes("VALUES (1, 'code-1')"))).toBe(true);
    expect(faXCodesInserts.some((s) => /SCOPE_IDENTITY\(\)/i.test(s))).toBe(true);
  });

  it("emits only the BEGIN/COMMIT/ROLLBACK shell for an empty batch", () => {
    const batch = makeBatch();
    batch.codes = [];

    const result = buildLocalWritePlan(batch);

    expect(result.statements).toEqual(["BEGIN TRAN;", "-- COMMIT;", "-- ROLLBACK;"]);
    expect(result.affectedRows).toBe(0);
  });

  it("returns affectedRows equal to the number of INSERT statements, ignoring BEGIN / SELECT / commented COMMIT", () => {
    const batch = makeBatch();
    batch.codes[0]!.fa = [
      { id: 0, name: "Brand New Fa", state: "nuevo", status: "resolved", tipo: "Persona" },
    ];

    const result = buildLocalWritePlan(batch);

    // Expected: 1 INSERT Codes + 1 INSERT FA + 1 INSERT FAxCodes + 1 INSERT CodeOrigins = 4
    expect(getInsertCount(result.statements)).toBe(4);
    expect(result.affectedRows).toBe(getInsertCount(result.statements));
  });

  it("is a pure function — the same input produces the same output on every call (no time/random)", () => {
    const batch = makeBatch();

    const first = buildLocalWritePlan(batch);
    const second = buildLocalWritePlan(batch);

    expect(second).toEqual(first);
  });

  it("escapes single quotes in string values by doubling them (T-SQL literal safety)", () => {
    const batch = makeBatch();
    batch.codes[0]!.repName = "O'Brien";

    const statements = buildLocalWritePlan(batch).statements;

    expect(statements.some((s) => s.includes("'O''Brien'"))).toBe(true);
    // No raw single-quote survives in any literal: every `'` is doubled, so
    // an odd-length apostrophe run inside a string is impossible.
    for (const statement of statements) {
      // Find every `'...'` literal and assert it contains no unpaired `'`.
      const literals = statement.match(/'[^']*'/g) ?? [];
      for (const literal of literals) {
        expect(literal.includes("''")).toBe(false);
      }
    }
  });
});