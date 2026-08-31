/**
 * BranchRep vs live `Codes` dedupe (PRD v5 `dupcheck` field).
 *
 * A batch entry's BranchRep is checked against a live-queried snapshot of the
 * `Codes` table. This is safety-relevant: a missed duplicate would insert a
 * wrong production row, so the match is deterministic and normalized
 * (case-insensitive, whitespace-trimmed) rather than a byte-exact compare.
 */

export const DUP_CHECK = {
  NEW: "nuevo",
  EXISTING: "existente",
} as const;

export type DupCheckResult = (typeof DUP_CHECK)[keyof typeof DUP_CHECK];

import { normalizeBranchRep } from "./normalize.js";

export interface LiveCodeRecord {
  branchRep: string;
}

export function checkDuplicate(
  branchRep: string,
  liveCodes: LiveCodeRecord[],
): DupCheckResult {
  const normalized = normalizeBranchRep(branchRep);
  const isDuplicate = liveCodes.some(
    (code) => normalizeBranchRep(code.branchRep) === normalized,
  );
  return isDuplicate ? DUP_CHECK.EXISTING : DUP_CHECK.NEW;
}
