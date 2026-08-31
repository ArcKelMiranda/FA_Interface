/**
 * "Same Branch+Rep implies same FA" propagation (PRD v5 §5, spec `fa-assignment`).
 *
 * When two or more codes in a batch share the same BranchRep, resolving one
 * code's FA becomes the default suggestion for the others in that group. This
 * is a suggestion only — it never overwrites an FA the user already resolved.
 */

import { normalizeBranchRep } from "./normalize.js";

export interface BranchRepFaAssignment {
  id: string;
  branchRep: string;
  resolvedFaId: number | null;
}

export type FaSuggestionMap = Record<string, number | null>;

export function propagateFaByBranchRep(
  entries: BranchRepFaAssignment[],
): FaSuggestionMap {
  const resolvedFaByGroup = new Map<string, number>();
  for (const entry of entries) {
    if (entry.resolvedFaId === null) continue;
    const key = normalizeBranchRep(entry.branchRep);
    if (!resolvedFaByGroup.has(key)) {
      resolvedFaByGroup.set(key, entry.resolvedFaId);
    }
  }

  const result: FaSuggestionMap = {};
  for (const entry of entries) {
    if (entry.resolvedFaId !== null) {
      result[entry.id] = entry.resolvedFaId;
      continue;
    }
    const key = normalizeBranchRep(entry.branchRep);
    result[entry.id] = resolvedFaByGroup.get(key) ?? null;
  }
  return result;
}
