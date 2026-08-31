/**
 * UBS-specific BranchRep parsing (PRD v5 §5, spec `fa-assignment` —
 * Format-Specific Resolution Rules).
 *
 * DEVIATION / RISK: see the identical note in `./pershing.ts` — the real
 * `gestion-fa-codes-sql` skill is confirmed absent from disk. UBS BranchRep
 * values are commonly "branch/rep" slash-separated pairs; this is a
 * best-effort placeholder for that convention, not the verified legacy
 * algorithm. MUST be validated against real MR data before Phase 7 E2E.
 */

export interface ParsedBranchRep {
  raw: string;
  branch: string;
  rep: string;
  format: "ubs";
}

const UBS_SEPARATOR = "/";

export function parseUbsBranchRep(raw: string): ParsedBranchRep {
  const [branchPart = "", repPart = ""] = raw.split(UBS_SEPARATOR);
  return {
    raw,
    branch: branchPart.trim(),
    rep: repPart.trim(),
    format: "ubs",
  };
}
