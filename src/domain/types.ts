/**
 * `BatchAnalysis` — the PRD v5 §6 JSON contract, versioned with
 * `contractVersion` so the legacy paste-JSON path (Claude chat + the
 * `gestion-fa-codes-sql` skill) and the live MCP resolver stay
 * interchangeable. This is facodes' anti-corruption boundary
 * (design.md Decision 1 / Testing Strategy — Contract layer).
 */

import { z } from "zod";

export const CONTRACT_VERSION = "1.0.0";

const fieldStatusSchema = z.enum([
  "resolved",
  "needs_confirm",
  "needs_input",
  "no_data",
]);

const alternativeSchema = z.object({
  label: z.string(),
  hint: z.string().optional(),
});

const fieldSchema = z.object({
  value: z.string(),
  valueId: z.number().optional(),
  status: fieldStatusSchema,
  evidence: z.string().optional(),
  alternatives: z.array(alternativeSchema).optional(),
});

const faAlternativeSchema = z.object({
  label: z.string(),
  faId: z.number(),
  faName: z.string(),
  hint: z.string().optional(),
});

const faEntrySchema = z.object({
  id: z.number(),
  name: z.string(),
  state: z.enum(["existente", "nuevo"]),
  status: fieldStatusSchema.optional(),
  evidence: z.string().optional(),
  tipo: z.enum(["Persona", "Empresa", "Sin identificar"]).optional(),
  alternatives: z.array(faAlternativeSchema).optional(),
});

const faDiscardedSchema = z.object({
  id: z.number(),
  name: z.string(),
  reason: z.string(),
});

const referenceSchema = z.object({
  title: z.string(),
  description: z.string(),
  columns: z.array(z.string()),
  rows: z.array(z.record(z.string(), z.unknown())),
  footnote: z.string().optional(),
});

const codeFieldsSchema = z.object({
  office: fieldSchema,
  country: fieldSchema,
  region: fieldSchema,
  ibd: fieldSchema,
  nscc: fieldSchema,
  origin: fieldSchema,
  dealer: fieldSchema,
  agente: fieldSchema,
});

const codeEntrySchema = z.object({
  id: z.string(),
  branchRep: z.string(),
  repName: z.string(),
  dupcheck: z.enum(["nuevo", "existente"]).optional(),
  fields: codeFieldsSchema,
  fa: z.array(faEntrySchema),
  faDiscarded: z.array(faDiscardedSchema).optional(),
  references: z.array(referenceSchema).optional(),
  alerts: z.array(z.string()).optional(),
});

export const batchAnalysisSchema = z.object({
  contractVersion: z.string().default(CONTRACT_VERSION),
  batchNo: z.number(),
  snapshot: z.string(),
  codes: z.array(codeEntrySchema),
});

export type BatchAnalysis = z.infer<typeof batchAnalysisSchema>;
export type CodeEntry = z.infer<typeof codeEntrySchema>;
export type FaEntry = z.infer<typeof faEntrySchema>;
