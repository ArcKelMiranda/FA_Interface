/**
 * `AnalysisAdvisor` — optional driven port for judgment-shaped analysis
 * (design.md Decision 1): fuzzy FA name ranking, false-company detection,
 * evidence prose, and the legacy paste-JSON ingest bridge. No
 * implementation ships in Phase 3; facodes' deterministic core
 * (`src/domain/`) runs with zero LLM credentials whenever this port is
 * absent — see design.md's "Alternatives rejected" for Decision 1.
 *
 * `assessFalseCompany` is complementary to, not a replacement for,
 * `src/domain/false-company.ts`'s deterministic heuristic (see tasks.md
 * 2.6 NOTE): the domain heuristic is a free, always-on pre-filter; this
 * port's judgment is optional and costs an LLM call.
 */

import type { BatchAnalysis, FaEntry } from "../domain/types.js";

export interface FaRankingSuggestion {
  faId: number;
  faName: string;
  confidence: number;
  hint?: string;
}

export interface FalseCompanySignal {
  suspected: boolean;
  reason?: string;
}

export interface AnalysisAdvisor {
  rankFaAlternatives(
    candidateName: string,
    knownFas: FaEntry[],
  ): Promise<FaRankingSuggestion[]>;

  assessFalseCompany(candidateName: string): Promise<FalseCompanySignal>;

  describeEvidence(context: Record<string, unknown>): Promise<string>;

  /** Migration bridge: converts v5 paste-JSON into the `BatchAnalysis` contract. */
  ingestLegacyPaste(pastedJson: string): Promise<BatchAnalysis>;
}
