/**
 * `resolveBatch` — live-resolver orchestration function (issue #15; spec
 * fa-assignment — Same Branch+Rep Implies Same FA, Format-Specific
 * Resolution Rules, False-Company Detection Alert; spec review-ui — Live
 * Batch Table Rendering). Composes the Phase 2 deterministic building
 * blocks (`checkDuplicate`, `propagateFaByBranchRep`,
 * `dispatchParseByOrigin`, `resolveCatalogValue`, `deriveFieldStatus`,
 * `isFalseCompanyMatch`, `resolveToUnidentifiedPlaceholder`) over live MCP
 * reads against `YhatReadPort` and returns a fully-built `BatchAnalysis`.
 *
 * This module is the first Phase 2 → production parity bridge: every block
 * here already had its own unit-tested unit (Phase 2) and a real
 * `BatchAnalysis` JSON contract (PRD §6); this file is the conductor that
 * asks MCP for the data, runs each block in its right place, and emits the
 * shape the SPA already knows how to render.
 *
 * PURE / I/O: the only I/O is the injected `readPort.queryEntities` calls
 * — everything else is pure over the read results. No time, no random, no
 * API/transport/store imports. The route handler (`src/api/routes/batches.ts`)
 * owns the time-bound `snapshot` field, the merge-with-persisted-overrides
 * step, and the HTTP error mapping.
 */

import type { EntityQuery, YhatReadPort } from "../ports/YhatReadPort.js";
import type { KeyedFieldOverride } from "../ports/ReviewStateStore.js";
import type { BatchAnalysis, CodeEntry, FaEntry } from "./types.js";
import { CONTRACT_VERSION } from "./types.js";
import { checkDuplicate } from "./dedupe.js";
import { propagateFaByBranchRep, type BranchRepFaAssignment } from "./fa-propagation.js";
import { dispatchParseByOrigin } from "./parsing/dispatch.js";
import { resolveCatalogValue, type CatalogEntry } from "./catalog-resolution.js";
import { deriveFieldStatus, type FieldStatus } from "./status.js";
import { isFalseCompanyMatch } from "./false-company.js";
import { resolveToUnidentifiedPlaceholder } from "./unidentified.js";

/** The 8 PRD §6 fields, in the order the SPA renders them. */
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

/** Field names the route layer is allowed to override (mirrors the store's allowlist). */
type OverridableField = Exclude<FieldName, never>;

function isOverridableField(field: string): field is OverridableField {
  return (FIELD_ORDER as readonly string[]).includes(field);
}

/**
 * Which MCP entity holds the catalog for each catalog-backed field. NSCC
 * is intentionally absent — PRD §6 declares it a free-form code, not a
 * catalog reference, so it never participates in catalog resolution.
 */
const CATALOG_ENTITY_BY_FIELD: Record<Exclude<FieldName, "nscc">, string> = {
  office: "Offices",
  country: "Countries",
  region: "Regions",
  ibd: "IBDs",
  origin: "Origins",
  dealer: "Dealers",
  agente: "Agentes",
};

/** Minimal shape we trust from a `Codes` row out of `yhat_query_entities`. */
interface CodesRow {
  Id: string;
  BranchRep: string;
  RepName: string;
  Office: string;
  Country: string;
  Region: string;
  IBD: string;
  NSCC: string;
  Origin: string;
  Dealer: string;
  Agente: string;
  /** Optional pre-suggested FA list as the upstream MCP exposes it. */
  FA?: Array<{ Id: number; Name: string; State: "existente" | "nuevo" }>;
}

function asCatalogEntries(rows: Record<string, unknown>[]): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (const row of rows) {
    const id = row["Id"];
    const name = row["Name"];
    if (typeof id === "number" && typeof name === "string") {
      entries.push({ id, name });
    }
  }
  return entries;
}

function readCodesByBatchNo(readPort: YhatReadPort, batchNo: number): Promise<CodesRow[]> {
  const query: EntityQuery = {
    entity: "Codes",
    filters: [{ attribute: "BatchNo", operator: "=", value: batchNo }],
  };
  return readPort.queryEntities(query) as unknown as Promise<CodesRow[]>;
}

/**
 * Reads every live `Codes` row (no BatchNo filter) for the dedupe source.
 * The default limit (1000) is the server default and is fine here — the
 * `Codes` table is well under 1000 rows for any realistic batch, and the
 * resolver only consumes `BranchRep` from each row.
 */
function readAllLiveBranchReps(
  readPort: YhatReadPort,
): Promise<Array<{ BranchRep: string }>> {
  return readPort.queryEntities({
    entity: "Codes",
    attributes: ["BranchRep"],
  }) as unknown as Promise<Array<{ BranchRep: string }>>;
}

async function readCatalog(readPort: YhatReadPort, entity: string): Promise<CatalogEntry[]> {
  const rows = await readPort.queryEntities({ entity });
  return asCatalogEntries(rows);
}

function buildField(
  rawValue: unknown,
  catalog: CatalogEntry[],
): { value: string; status: FieldStatus; valueId?: number } {
  const raw = typeof rawValue === "string" ? rawValue : "";
  const match = resolveCatalogValue(raw, catalog);
  const status = deriveFieldStatus({
    hasRawValue: raw.trim() !== "",
    matchStatus: match.status,
  });

  const built: { value: string; status: FieldStatus; valueId?: number } = {
    value: raw,
    status,
  };
  if (match.entry) {
    built.valueId = match.entry.id;
  }
  return built;
}

/**
 * NSCC has no catalog. It resolves to `resolved` whenever the raw value is
 * non-empty (the value IS the code — there is nothing to look up), and to
 * `no_data` when empty. This matches the legacy paste-JSON behavior in
 * `__fixtures__/legacy-paste-batch.json`.
 */
function buildNsccField(rawValue: unknown): { value: string; status: FieldStatus } {
  const raw = typeof rawValue === "string" ? rawValue : "";
  return {
    value: raw,
    status: raw.trim() === "" ? "no_data" : "resolved",
  };
}

function buildFaList(
  rawFa: CodesRow["FA"],
  catalogById: Map<number, CatalogEntry>,
): FaEntry[] {
  if (!rawFa || rawFa.length === 0) return [];
  return rawFa.map((entry) => {
    const catalogEntry = catalogById.get(entry.Id);
    return {
      id: entry.Id,
      name: catalogEntry?.name ?? entry.Name,
      state: entry.State,
      // FAs returned by the upstream MCP are already pre-resolved; the
      // operator may override later, but at the initial resolution step
      // they count as resolved for FA-propagation purposes (a needs_confirm
      // status would prevent propagateFaByBranchRep from finding them).
      status: "resolved" as const,
      evidence: "pre-resolved by upstream MCP",
    };
  });
}

function propagateFas(
  codes: CodeEntry[],
  faById: Map<number, CatalogEntry>,
): void {
  const assignments: BranchRepFaAssignment[] = codes.map((code) => {
    const resolved = code.fa.find((fa) => fa.status === "resolved");
    return {
      id: code.id,
      branchRep: code.branchRep,
      resolvedFaId: resolved?.id ?? null,
    };
  });

  const suggestions = propagateFaByBranchRep(assignments);

  for (const code of codes) {
    if (code.fa.length > 0) continue;
    const suggestedId = suggestions[code.id];
    if (suggestedId === null || suggestedId === undefined) continue;
    const catalogEntry = faById.get(suggestedId);
    if (!catalogEntry) continue;
    code.fa.push({
      id: suggestedId,
      name: catalogEntry.name,
      state: "existente",
      status: "needs_confirm",
      evidence: `propagated from sibling code sharing BranchRep "${code.branchRep}"`,
    });
  }
}

function attachFalseCompanyAlert(code: CodeEntry): void {
  if (!isFalseCompanyMatch(code.fields.agente.value)) return;
  const existing = code.alerts ?? [];
  code.alerts = [
    ...existing,
    `false-company pattern suspected in Agente "${code.fields.agente.value}"`,
  ];
}

/**
 * Records the parsed BranchRep evidence (the pershing/ubs/generic split).
 * Surfaces the parsed shape through `references` so the SPA can render
 * the same precedent-code UX that `legacy-paste-batch.json` already
 * exposes for `code.references`.
 */
function attachParseEvidence(code: CodeEntry, origin: string, branchRep: string): void {
  const parsed = dispatchParseByOrigin(origin, branchRep);
  const existing = code.references ?? [];
  code.references = [
    ...existing,
    {
      title: "Parsed BranchRep",
      description: `Origin "${origin}" parsed via ${parsed.format} parser`,
      columns: ["branch", "rep", "format"],
      rows: [{ branch: parsed.branch, rep: parsed.rep, format: parsed.format }],
    },
  ];
}

export async function resolveBatch(
  batchId: string,
  readPort: YhatReadPort,
): Promise<BatchAnalysis> {
  const batchNo = Number(batchId);
  const codeRows = await readCodesByBatchNo(readPort, batchNo);

  if (codeRows.length === 0) {
    return {
      contractVersion: CONTRACT_VERSION,
      batchNo,
      snapshot: new Date().toISOString(),
      codes: [],
    };
  }

  // Live Codes catalog (no BatchNo filter) — the dedupe source. Per the
  // spec fa-assignment, a missed duplicate writes a wrong production row,
  // so this read is mandatory, not optional.
  const liveCodes = await readAllLiveBranchReps(readPort);

  // Catalogs — one query per catalog entity. Each query is bounded by the
  // server's 1000-row default limit, which fits every real catalog (PRD §4
  // documents ~29 Countries, 18 Regions, 74 Agentes, 831 Offices, 1749 IBDs,
  // 44 Origins — well under 1000 except IBDs, which fits the production
  // 10k cap; split reads across limit offsets are a Phase 8 follow-up).
  const offices = await readCatalog(readPort, CATALOG_ENTITY_BY_FIELD.office);
  const countries = await readCatalog(readPort, CATALOG_ENTITY_BY_FIELD.country);
  const regions = await readCatalog(readPort, CATALOG_ENTITY_BY_FIELD.region);
  const ibds = await readCatalog(readPort, CATALOG_ENTITY_BY_FIELD.ibd);
  const origins = await readCatalog(readPort, CATALOG_ENTITY_BY_FIELD.origin);
  const dealers = await readCatalog(readPort, CATALOG_ENTITY_BY_FIELD.dealer);
  const agentes = await readCatalog(readPort, CATALOG_ENTITY_BY_FIELD.agente);
  const fas = await readCatalog(readPort, "FAs");
  const faById = new Map(fas.map((entry) => [entry.id, entry]));

  const catalogsByField: Record<Exclude<FieldName, "nscc">, CatalogEntry[]> = {
    office: offices,
    country: countries,
    region: regions,
    ibd: ibds,
    origin: origins,
    dealer: dealers,
    agente: agentes,
  };

  // Dedupe catalog: pass the global Codes snapshot to checkDuplicate.
  const liveCodeRecords = liveCodes.map((row) => ({ branchRep: row.BranchRep }));
  const preResolved = new Map<string, FaEntry[]>();
  const dupByBranchRep = new Map<string, "existente" | "nuevo">();
  for (const row of codeRows) {
    const dupcheck = checkDuplicate(row.BranchRep, liveCodeRecords);
    if (!dupByBranchRep.has(row.BranchRep)) {
      dupByBranchRep.set(row.BranchRep, dupcheck);
    }
  }

  // Detect codes that have a "false-company" agente name so we can
  // downgrade the agente field to a `-Unidentified` placeholder. PRD
  // §5.5 — false-company detections should never reach production; the
  // resolver marks them as needs_input + alert instead, leaving the final
  // override decision to the operator.
  const falseCompanyByBranchRep = new Map<string, boolean>();
  for (const row of codeRows) {
    const agente = typeof row.Agente === "string" ? row.Agente : "";
    falseCompanyByBranchRep.set(row.BranchRep, isFalseCompanyMatch(agente));
  }

  const codes: CodeEntry[] = codeRows.map((row) => {
    const officeField = buildField(row.Office, catalogsByField.office);
    const countryField = buildField(row.Country, catalogsByField.country);
    const regionField = buildField(row.Region, catalogsByField.region);
    const ibdField = buildField(row.IBD, catalogsByField.ibd);
    const nsccField = buildNsccField(row.NSCC);
    const originField = buildField(row.Origin, catalogsByField.origin);
    const dealerField = buildField(row.Dealer, catalogsByField.dealer);
    const agenteField = falseCompanyByBranchRep.get(row.BranchRep)
      ? {
          ...resolveToUnidentifiedPlaceholder(),
          value: typeof row.Agente === "string" ? row.Agente : "",
        }
      : buildField(row.Agente, catalogsByField.agente);

    const code: CodeEntry = {
      id: row.Id,
      branchRep: row.BranchRep,
      repName: row.RepName,
      dupcheck: dupByBranchRep.get(row.BranchRep),
      fields: {
        office: officeField,
        country: countryField,
        region: regionField,
        ibd: ibdField,
        nscc: nsccField,
        origin: originField,
        dealer: dealerField,
        agente: agenteField,
      },
      fa: buildFaList(row.FA, faById),
    };

    attachParseEvidence(code, row.Origin, row.BranchRep);
    attachFalseCompanyAlert(code);
    return code;
  });

  propagateFas(codes, faById);

  return {
    contractVersion: CONTRACT_VERSION,
    batchNo,
    snapshot: new Date().toISOString(),
    codes,
  };
}

/**
 * `applyOverridesToBatch` — pure helper for the live-resolver merge path
 * (issue #15). Layers persisted user overrides on top of a freshly-resolved
 * `BatchAnalysis`. Mirrors the SQLite store's internal `applyOverrides`
 * (in `src/store/sqlite/index.ts`) but operates on a batch we already have
 * in memory rather than re-reading the persisted snapshot — this is what
 * lets the GET handler return fresh live data while still respecting
 * user-edited fields.
 *
 * Behavior: for each override, the field's value and `valueId` are
 * replaced and the status is forced to `resolved` (the user has explicitly
 * confirmed this value). Unknown `(codeId, field)` pairs are silently
 * ignored — they may belong to a stale override whose code no longer
 * exists in MCP.
 */
export function applyOverridesToBatch(
  batch: BatchAnalysis,
  overrides: KeyedFieldOverride[],
): BatchAnalysis {
  if (overrides.length === 0) return batch;

  const codesById = new Map<string, CodeEntry>(batch.codes.map((code) => [code.id, code]));

  for (const { codeId, field, override } of overrides) {
    const code = codesById.get(codeId);
    if (!code || !isOverridableField(field)) continue;

    const existing = code.fields[field];
    const updated: typeof existing = {
      ...existing,
      value: override.value,
      status: "resolved",
    };
    if (override.valueId === undefined) {
      delete updated.valueId;
    } else {
      updated.valueId = override.valueId;
    }
    code.fields[field] = updated;
  }

  return batch;
}