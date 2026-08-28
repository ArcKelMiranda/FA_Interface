/**
 * False-company heuristic alert flag (spec `fa-assignment` — False-Company
 * Detection Alert).
 *
 * DEVIATION / NOTE: `design.md` Decision 1 assigns "false-company detection"
 * broadly to the optional `AnalysisAdvisor` (LLM) port for fuzzy/judgment
 * ranking. `tasks.md` 2.6 asks for a cheap deterministic *pre-filter* here in
 * `domain/` instead — an obvious-pattern substring match that needs no LLM
 * call and runs on every batch for free. It intentionally does not replace
 * `AnalysisAdvisor`'s fuzzier judgment; it only catches the obvious cases.
 */

export const DEFAULT_FALSE_COMPANY_PATTERNS: readonly string[] = [
  "prueba",
  "test",
  "sin nombre",
  "desconocido",
  "n/a",
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function isFalseCompanyMatch(
  name: string,
  patterns: readonly string[] = DEFAULT_FALSE_COMPANY_PATTERNS,
): boolean {
  if (name.trim() === "") return false;
  const normalizedName = normalize(name);
  return patterns.some((pattern) =>
    normalizedName.includes(normalize(pattern)),
  );
}
