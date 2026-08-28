/**
 * Pershing-specific BranchRep parsing (PRD v5 §5, spec `fa-assignment` —
 * Format-Specific Resolution Rules).
 *
 * DEVIATION / RISK: the real `gestion-fa-codes-sql` skill that historically
 * encoded this rule is confirmed absent from disk (see tasks.md 0.2). Pershing
 * BranchRep values are commonly a fixed-width numeric branch+rep pair with no
 * separator (e.g. "12345678" -> branch "1234", rep "5678"); this is a
 * best-effort placeholder for that convention, not the verified legacy
 * algorithm. MUST be validated against real MR data before Phase 7 E2E.
 */

export interface ParsedBranchRep {
  raw: string;
  branch: string;
  rep: string;
  format: "pershing";
}

const PERSHING_BRANCH_LENGTH = 4;

export function parsePershingBranchRep(raw: string): ParsedBranchRep {
  const trimmed = raw.trim();
  return {
    raw,
    branch: trimmed.slice(0, PERSHING_BRANCH_LENGTH),
    rep: trimmed.slice(PERSHING_BRANCH_LENGTH),
    format: "pershing",
  };
}
