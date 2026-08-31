/**
 * Origin-based BranchRep parser dispatcher (spec `fa-assignment` —
 * Format-Specific Resolution Rules).
 *
 * Selects the right per-Origin parser (`Pershing`, `UBS`, generic, ...)
 * from a small data-driven lookup. Adding a new origin is one map entry:
 * the lookup is the source of truth, not an if/else chain.
 *
 * Each underlying parser (pershing.ts, ubs.ts, parseGenericBranchRep
 * below) returns the same `ParsedBranchRep` shape with a `format`
 * discriminator — TypeScript variance lets the existing per-format
 * `ParsedBranchRep` returns be assigned to the union here without casts.
 */

import { parsePershingBranchRep } from "./pershing.js";
import { parseUbsBranchRep } from "./ubs.js";

export type BranchRepFormat = "pershing" | "ubs" | "generic";

export interface ParsedBranchRep {
  raw: string;
  branch: string;
  rep: string;
  format: BranchRepFormat;
}

/**
 * Generic fallback: pass the (trimmed) raw value through as the branch
 * with an empty rep. Used when the origin is unknown or explicitly
 * "generic", and as the default branch of the dispatcher.
 */
export function parseGenericBranchRep(raw: string): ParsedBranchRep {
  const trimmed = raw.trim();
  return {
    raw,
    branch: trimmed,
    rep: "",
    format: "generic",
  };
}

// Origin names are normalized to lowercase + trimmed before lookup so the
// dispatcher tolerates "Pershing", "pershing", "  PERSHING  ", etc. —
// upstream data uses mixed casing per the same convention as the
// resolver's existing origin normalization in src/domain/normalize.ts.
const ORIGIN_PARSERS: Record<string, (raw: string) => ParsedBranchRep> = {
  pershing: parsePershingBranchRep,
  ubs: parseUbsBranchRep,
  generic: parseGenericBranchRep,
};

export function dispatchParseByOrigin(origin: string, branchRep: string): ParsedBranchRep {
  const key = origin.trim().toLowerCase();
  const parser = ORIGIN_PARSERS[key] ?? parseGenericBranchRep;
  return parser(branchRep);
}
