/**
 * `buildLocalWritePlan` — pure production-parity SQL preview generator
 * (PRD v5 §5.5; spec write-confirmation — Full Write Preview Rendering).
 *
 * Moved out of `src/api/routes/write.ts` (issue #18) so the preview generator
 * sits next to the rest of the deterministic `domain/` rules and is trivially
 * unit-testable. It has no I/O, no time, no random, no API/MCP imports — it
 * only transforms a fully-resolved `BatchAnalysis` into the exact SQL script
 * that `yhat-mcp-server`'s future `yhat_write_codes {mode:"plan"}` would
 * produce: a single `BEGIN TRAN`, one `INSERT INTO [Codes]` per code with
 * inline comments showing the resolved display names, `INSERT INTO [FAxCodes]`
 * per existing FA (or `INSERT INTO [FA]` + `INSERT INTO [FAxCodes]` for a new
 * FA via `SCOPE_IDENTITY()`), a batched `INSERT INTO [CodeOrigins]`, a
 * verification `SELECT` joining against Offices/Countries/Origins filtered by
 * `BatchNo`, and `COMMIT`/`ROLLBACK` left **commented** (PRD §7 — defensive
 * force-review-before-persist gate, successor to the v5 commented-COMMIT
 * pattern; no auto-commit on production writes).
 *
 * SAFETY: every string literal is T-SQL-escaped (single-quote doubled) so a
 * BranchRep or repName containing an apostrophe cannot break out of its
 * literal. Numeric `valueId`s are emitted as bare numbers, never quoted.
 */

import type { BatchAnalysis, FaEntry } from "./types.js";

export interface LocalWritePlan {
  statements: string[];
  affectedRows: number;
}

/** Names of the 8 catalog-resolved fields, in the order PRD §6 lists them. */
const FIELD_ORDER = [
  "office",
  "country",
  "region",
  "ibd",
  "nscc",
  "origin",
  "dealer",
  "agente",
] as const;

type FieldName = (typeof FIELD_ORDER)[number];

/** Human-readable label per field for the inline resolved-name comment. */
const FIELD_LABEL: Record<FieldName, string> = {
  office: "Office",
  country: "Country",
  region: "Region",
  ibd: "IBD",
  nscc: "NSCC",
  origin: "Origin",
  dealer: "Dealer",
  agente: "Agente",
};

/**
 * T-SQL literal escaping: doubled single-quotes. PRD-faithful strings only
 * pass through this — numeric `valueId`s are emitted unquoted.
 */
function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function isInsertStatement(statement: string): boolean {
  return /^\s*INSERT\s+INTO\b/i.test(statement);
}

function buildCodesInsert(code: BatchAnalysis["codes"][number], batchNo: number): string {
  const fields = code.fields;
  // Catalog FK columns are emitted in the order PRD §6 lists them so the
  // generated script is column-positional and easy to scan against the
  // production Codes schema. NSCC has no FK column (it's a free-form code,
  // not a catalog reference) — see PRD §6.
  const fkColumns = ["OfficeId", "CountryId", "RegionId", "IBDId"];
  const fkValues = (["office", "country", "region", "ibd"] as const).map((name) => {
    const v = fields[name].valueId;
    return v === undefined ? "NULL" : String(v);
  });
  const nsccValue = fields.nscc.value.trim() === "" ? "NULL" : sqlString(fields.nscc.value);
  const tailFks = (["origin", "dealer", "agente"] as const).map((name) => {
    const v = fields[name].valueId;
    return v === undefined ? "NULL" : String(v);
  });

  const columns = [
    "[BatchNo]",
    "[Id]",
    "[BranchRep]",
    "[RepName]",
    ...fkColumns,
    "[NSCC]",
    "[OriginId]",
    "[DealerId]",
    "[AgenteId]",
  ];
  const values = [
    String(batchNo),
    sqlString(code.id),
    sqlString(code.branchRep),
    sqlString(code.repName),
    ...fkValues,
    nsccValue,
    ...tailFks,
  ];

  const header = `INSERT INTO [Codes] (${columns.join(", ")})`;
  return `${header}\nVALUES (${values.join(", ")});`;
}

function buildResolvedNamesComment(code: BatchAnalysis["codes"][number]): string {
  const parts = FIELD_ORDER.map((name) => `${FIELD_LABEL[name]}: ${code.fields[name].value}`);
  return `-- ${parts.join(", ")}`;
}

function buildFaBlock(fa: FaEntry, codeId: string): string[] {
  if (fa.state === "existente" && typeof fa.id === "number") {
    return [`INSERT INTO [FAxCodes] ([FAId], [CodeId]) VALUES (${fa.id}, ${sqlString(codeId)});`];
  }

  const tipo = fa.tipo ?? "Sin identificar";
  return [
    `-- FA: ${fa.name} (new, tipo=${tipo}) for ${codeId}`,
    `INSERT INTO [FA] ([Name], [Tipo]) VALUES (${sqlString(fa.name)}, ${sqlString(tipo)});`,
    `INSERT INTO [FAxCodes] ([FAId], [CodeId]) VALUES (SCOPE_IDENTITY(), ${sqlString(codeId)});`,
  ];
}

function buildCodeOriginsInsert(batch: BatchAnalysis): string {
  const rows = batch.codes
    .map((code) => {
      const originId = code.fields.origin.valueId;
      const codeIdLiteral = sqlString(code.id);
      const originLiteral = originId === undefined ? "NULL" : String(originId);
      return `(${codeIdLiteral}, ${originLiteral})`;
    })
    .join(", ");
  return rows === ""
    ? `INSERT INTO [CodeOrigins] ([CodeId], [OriginId]) DEFAULT VALUES;`
    : `INSERT INTO [CodeOrigins] ([CodeId], [OriginId]) VALUES ${rows};`;
}

function buildVerificationSelect(batchNo: number): string {
  return [
    "SELECT c.[Id] AS CodeId, c.[BranchRep], c.[RepName],",
    "       o.[Name] AS Office, co.[Name] AS Country, r.[Name] AS Region, org.[Name] AS Origin",
    "FROM [Codes] c",
    "LEFT JOIN [Offices] o ON c.[OfficeId] = o.[Id]",
    "LEFT JOIN [Countries] co ON c.[CountryId] = co.[Id]",
    "LEFT JOIN [Regions] r ON c.[RegionId] = r.[Id]",
    "LEFT JOIN [Origins] org ON c.[OriginId] = org.[Id]",
    `WHERE c.[BatchNo] = ${batchNo};`,
  ].join("\n");
}

export function buildLocalWritePlan(batch: BatchAnalysis): LocalWritePlan {
  const statements: string[] = ["BEGIN TRAN;"];

  // Codes first, each followed by its inline resolved-name comment so the
  // preview reads top-to-bottom in human order (one code at a time).
  for (const code of batch.codes) {
    statements.push(buildCodesInsert(code, batch.batchNo));
    statements.push(buildResolvedNamesComment(code));
  }

  // FAs (existing vs new) grouped per code. New FA blocks pair the
  // INSERT INTO [FA] with its INSERT INTO [FAxCodes] via SCOPE_IDENTITY() so
  // each new-FA row's auto-generated Id is the FK used by the link row.
  for (const code of batch.codes) {
    for (const fa of code.fa) {
      statements.push(...buildFaBlock(fa, code.id));
    }
  }

  // CodeOrigins is a single batched insert covering every code in one shot.
  if (batch.codes.length > 0) {
    statements.push(buildCodeOriginsInsert(batch));

    // Verification SELECT sits before the commented COMMIT/ROLLBACK so the
    // operator can scan the inserted shape against the joined lookup data
    // before deciding to uncomment COMMIT.
    statements.push(buildVerificationSelect(batch.batchNo));
  }

  statements.push("-- COMMIT;");
  statements.push("-- ROLLBACK;");

  const affectedRows = statements.filter(isInsertStatement).length;
  return { statements, affectedRows };
}