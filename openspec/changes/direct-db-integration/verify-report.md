# Verification Report: direct-db-integration - Work Unit 1 (Phase 0 + Phase 1)

**Change**: direct-db-integration
**Scope**: Work Unit 1 ONLY - Phase 0 (Archive Prerequisite, tasks 0.1-0.2) + Phase 1 (Project Scaffold, tasks 1.1-1.6)
**Mode**: Tasks + specs + design artifacts available (full spec-driven verification degraded appropriately - this unit is scaffolding-only and implements zero spec requirements by design)
**Strict TDD**: enabled globally, but N/A for this unit - none of tasks 0.1-1.6 are tagged RED+GREEN in tasks.md (that tagging begins at Phase 2). No TDD Cycle Evidence table applies here.
**apply-progress artifact**: NOT retrievable in this session - mem_star (Engram) tools were not present in this agent tool inventory (consistent with the known tooling gap noted for every phase this session), and no local apply-progress.md copy exists on disk under openspec/changes/direct-db-integration/. Verification below is based on direct reproduction: actual repository files, git history, tasks.md inline deviation notes, the work_unit_1_result block in state.yaml, and live command execution - not on the apply phase self-report.

---

## Reproduction Summary (what was actually re-run in this environment)

| Check | Command | Result |
|---|---|---|
| Working tree state | git status, git branch -a | On feat/archive-and-scaffold, up to date with origin/feat/archive-and-scaffold; only state.yaml locally modified (orchestrator tracking file, expected) |
| Dependency install | npm install | Clean, 284 packages audited, 0 vulnerabilities (allow-scripts warning for better-sqlite3 node-gyp rebuild, module already loaded from a prior install) |
| better-sqlite3 native load (local) | node -e require better-sqlite3 | Loads OK |
| Test suite | npm test | vitest run: 1 file, 1 test, 1 passed |
| Type check | npm run typecheck | Clean, no errors |
| Build | npm run build | tsc clean + vite build succeeds (dist/web/index.html, dist/web/assets/index files) |
| Docker build (cached) | docker build -t facodes-verify test . | Succeeds (fully cached layers from a prior build) |
| Docker build (cold, no cache) | docker build --no-cache -t facodes-verify nocache . | Succeeds from scratch - deps stage installs python3/make/g++, npm ci compiles the better-sqlite3 native addon (about 18s), prod-deps prunes devDependencies, runtime copies only the pruned node_modules + dist |
| better-sqlite3 native load (runtime container, cached image) | docker run node -e require | Loads OK |
| better-sqlite3 functional test (runtime container, cold image) | docker run node -e create table/insert/select | rows: x=1 - fully functional, not just a bare require |
| Cleanup | docker rmi facodes-verify test and nocache tags | Both test images removed |
| PR metadata | gh pr view 1, gh pr view 2 | See PR Verification below |
| Commit message scan | git log format B on feat/archive-and-scaffold, 5 commits | No AI/Claude attribution anywhere |

Docker verdict: the task 1.4 claim that docker build succeeds and better-sqlite3 works inside the built image is independently confirmed in this environment, including with a cold no-cache build to rule out cached-layer false confidence, and with a real read/write SQLite round-trip rather than a bare require call. This was previously the highest-risk unverified claim in the unit; it now has real evidence.

---

## Task-by-Task Verification

### Phase 0: Archive Prerequisite

| Task | Claimed | Verified | Notes |
|---|---|---|---|
| 0.1 Archive v5 source | [x] with DEVIATION note | Confirmed, deviation handled honestly | archive/PRD_revision_facodes.md exists (verbatim PRD copy) and archive/README.md exists. Read archive/README.md in full: it explicitly states the v5 source does not exist anywhere accessible, explains the v5 artifact only ever lived in the Claude.ai artifact system, states plainly that true code-level rollback to v5 is not possible from this repository, and clarifies practical rollback is behavioral (go back to the v5 Claude.ai workflow), not git revert. This is not glossed over, it is stated as a real, named gap, not softened into a formality. |
| 0.2 Confirm gestion-fa-codes-sql skill usability | [x] with RISK note | Confirmed, honestly reported as unresolved | tasks.md states the skill was searched for in the standard Claude and OpenCode skills directories plus a recursive home-directory search, and found in none of them; explicitly states this cannot be confirmed and should be verified/resolved before relying on it as a fallback. The confirmed_risk field in state.yaml work_unit_1_result independently states the same finding. PR number 2 body repeats the same finding under Notes and deviations rather than silently marking the task done. This is exactly what task 0.2 asked for: confirmation was attempted honestly and reported as unable to confirm, not marked as if the skill were verified to still work. The underlying risk (no working stopgap fallback) remains open and is correctly still flagged as such, not silently closed. |

### Phase 1: Project Scaffold

| Task | Claimed | Verified | Notes |
|---|---|---|---|
| 1.1 package.json, tsconfig.json (Node 22, strict TS) | [x] | Confirmed | package.json has engines node >=22; tsconfig.json present, tsc --noEmit runs clean under it. |
| 1.2 vitest.config.ts; wire npm test | [x] | Confirmed | vitest.config.ts exists, test script is vitest run in package.json, reproduced: 1/1 tests pass. |
| 1.3 vite.config.ts for src/web SPA | [x] | Confirmed | vite.config.ts exists; src/web/index.html + src/web/main.tsx exist as placeholder entry; npm run build reproduced vite build output to dist/web/. |
| 1.4 Multi-stage Dockerfile; better-sqlite3 prebuild risk | [x] with RESOLVED note | Confirmed empirically, not just by inspection | See Reproduction Summary above - cold no-cache build plus functional SQLite round-trip in the runtime image, independently reproduced in this session. |
| 1.5 docker-compose.yml + .env.example | [x] with NOTE (env.example deviation) | Deviation handled consistently | env.example exists (no leading dot) and contains all three variables named in the design/task: YHAT_INTERNAL_IDENTITY, YHAT_INTERNAL_HOST, WRITE_TOOLS_ENABLED=false (plus PORT=8080, harmless extra). .gitignore contains .env, .env.*, and a negated rule for env.example that correctly un-ignores the template. docker-compose.yml references env_file pointing at .env (the file a developer creates locally by copying env.example), not .env.example, so there is no dangling reference to a nonexistent file. Consistent end-to-end. |
| 1.6 Update openspec/config.yaml | [x] | Confirmed | tdd true (Strict TDD Mode enabled), apply test_command npm test, verify test_command npm test, verify build_command npm run build, verify coverage_threshold 0. |

Design cross-check: the File Changes table in design.md lists Dockerfile, docker-compose.yml, .env.example as Create; compose joins yhat-internal as external. Matches the shipped scaffold (modulo the documented env.example naming deviation and the explicitly-flagged-as-provisional yhat-internal network name, which tasks.md 3.2 and the inline comment in docker-compose.yml both correctly mark as unverified/TBD rather than presenting as settled).

---

## Spec Compliance (informational - this unit implements zero spec requirements by design)

Counted requirements/scenarios across the 5 delta specs:

| Spec | Requirements | Scenarios |
|---|---|---|
| review-ui | 5 | 6 |
| fa-assignment | 6 | 7 |
| mcp-client | 4 | 5 |
| write-confirmation | 4 | 5 |
| persistence | not fully enumerated for this unit (Restart Survival confirmed present) | -- |

Verified: none of these requirements/scenarios are claimed as implemented anywhere in Work Unit 1 task checkboxes, PR number 2 body, or state.yaml. All Phase 2-8 tasks in tasks.md remain unchecked. Source tree contains only src/index.ts (a one-line log-statement stub explicitly commented as intentionally minimal, no routes/MCP client/store yet), src/smoke.test.ts, and src/web/index.html plus main.tsx placeholders. No domain, ports, MCP client, store, or API code exists yet. This matches the task brief expectation exactly - flagging this as a non-issue, not a gap: no spec-level functional requirement is silently claimed as done by this unit.

---

### TDD Compliance

Not applicable to this unit task set. Tasks 0.1-1.6 are archival/scaffolding tasks, none tagged RED+GREEN in tasks.md (that tagging convention begins at task 2.1). No TDD Cycle Evidence table was expected or required from the apply phase for this work unit, so its absence from the retrievable artifacts is not flagged as a violation.

### Test Layer Distribution

| Layer | Tests | Files |
|---|---|---|
| Unit | 1 | 1 (src/smoke.test.ts) |
| Integration | 0 | 0 |
| E2E | 0 | 0 |
| Total | 1 | 1 |

The single smoke test (expect 1 plus 1 toBe 2, under describe/it wired to Vitest) is trivially simple but is explicitly self-documented in-file as a harness placeholder (Phase 1 scaffold harness, proves npm test runs under Vitest before any domain logic exists; Phase 2 replaces this with real RED/GREEN suites), not presented as behavioral coverage. This is expected and appropriate for a scaffolding-only unit - not flagged as an assertion-quality violation, since it makes no behavioral claim to be trivial about.

### Changed File Coverage / Quality Metrics

coverage_threshold is 0 per openspec/config.yaml - coverage is explicitly not gated for this project at this stage. Given this unit ships one trivial smoke test over near-zero application logic, coverage percentage is not meaningful and is intentionally not computed here. Linter: none configured in package.json (no lint script) - not flagged, consistent with a scaffold-only unit. Type checker: tsc --noEmit ran clean (see Reproduction Summary).

---

## PR Verification

| PR | Base to Head | State | Base-ref correct? |
|---|---|---|---|
| 1 (tracker) | main to tracker/direct-db-integration | OPEN, draft | Matches chain_strategy feature-branch-chain in state.yaml (tracker PR targets main, kept draft, only merges once all 8 units land) |
| 2 (Work Unit 1) | tracker/direct-db-integration to feat/archive-and-scaffold | OPEN, not draft | Correctly targets the tracker branch, not main directly |

AI attribution scan: git log format B across all 5 commits on feat/archive-and-scaffold, and both PR bodies (gh pr view 1 and 2 full text) - zero instances of Co-Authored-By, Generated with Claude Code, session links, or any other AI attribution. This satisfies the explicit hard user constraint recorded as commit_pr_constraint in state.yaml.

---

## Issues

### CRITICAL
None found.

### WARNING
1. Task 0.2 risk remains genuinely open, not just documented. The absence of the gestion-fa-codes-sql skill means there is currently no verified working fallback/stopgap flow if direct-db-integration needs to be rolled back behaviorally. This is correctly flagged (not silently closed) in tasks.md, state.yaml, and PR number 2 - but it is still an unresolved risk that should be tracked forward into later phases or resolved before this unit rollback plan is relied upon in practice.
2. The yhat-internal external network name in docker-compose.yml is an unverified placeholder (correctly flagged inline as such, and already tracked as blocking task 3.2/8.2 in tasks.md). Not a defect in Work Unit 1 - flagging only to confirm it was not silently presented as final in the scaffold.

### SUGGESTION
1. Consider recording the cold-build (no-cache) verification step in the 1.4 note in tasks.md for future reference, since a cached-layer build alone would not have caught a regression in the compile-once/copy-artifact pattern.

---

## Design Coherence

Checked the File Changes table entries in design.md relevant to this unit (Dockerfile, docker-compose.yml, .env.example) against the shipped scaffold: coherent, with the one already-tracked, already-flagged env.example naming deviation (sandbox policy blocking .env star filenames) and the already-tracked yhat-internal network-name placeholder. Neither deviation was hidden; both are documented at the task, state, and PR levels consistently.

---

## Verdict

PASS

Work Unit 1 (Phase 0 archive + Phase 1 scaffold) is complete, correctly scoped (implements zero spec-level functional requirements, as intended), and its two documented deviations (missing v5 source, .env.example renamed to env.example) are handled honestly rather than glossed over. All reproducible checks (npm install, npm test, npm run typecheck, npm run build, and - going beyond the apply phase self-report - a cold docker build with no cache plus a functional SQLite read/write round-trip inside the built container) were independently re-run in this environment and passed. No AI/Claude attribution was found in any commit message or PR body. PR base branches match the declared feature-branch-chain strategy. The one remaining open item (task 0.2 stopgap-skill risk) is correctly reported as unresolved rather than falsely marked confirmed, and does not block this unit - it is forward-tracked.

What could not be verified in this environment: nothing material. Docker was available and both build modes (cached and no-cache) were exercised; this closes what would otherwise have been the largest unverified-claim gap for this unit.

---

## Key Learnings

1. A cold docker build with no cache plus a functional read and write SQLite call provides strictly stronger evidence than a cached build or a bare require check.
2. Strict TDD TDD Cycle Evidence table only applies to tasks explicitly tagged RED+GREEN in tasks.md, which begins at Phase 2, not Phase 0-1 scaffolding.
3. Documented deviations, the missing v5 source and the env.example renaming, were verified as honestly reported rather than glossed over.
4. The absence of the gestion-fa-codes-sql skill is correctly tracked as an open risk in three separate artifacts instead of falsely closed.
5. No spec-level functional requirement from the five delta specs is claimed as implemented in Work Unit 1, matching its intended scaffolding-only scope.

---
```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:4927af8d4a080423b37bcea2316b0d7bec36436bc84cf50fa44abd78eeb99938
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 0/0
scenarios: 0/0
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:3173a896c8131a53ab5092f477710c1d6e97a24a24aa3d421f4de4baf29d7f35
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:44757ddd13519d2e467d46bd07d9c43bbe50a405a08d5ab4cda8265e353f4759
```

# Verification Report: direct-db-integration - Work Unit 2 (Phase 2, Domain)

**Change**: direct-db-integration
**Scope**: Work Unit 2 ONLY - Phase 2 (Domain, pure business rules, no I/O), tasks 2.1-2.9
**Mode**: Strict TDD; tasks + specs + design artifacts available. Full-stack (UI/API/I/O) spec scenario compliance is out of scope for this unit by design (task brief and PR description both state "no ports, MCP client, store, API, or web code -- pure domain logic only"); domain-layer building-block support is verified and reported separately from full scenario compliance to avoid over-claiming.
**Envelope note**: the strict machine-readable envelope above reports requirements 0/0 and scenarios 0/0 because this work unit claims zero full end-to-end spec scenarios as delivered (by design, domain-only, no I/O/UI). The full informational count against the two relevant delta specs (fa-assignment: 7 requirements / 8 scenarios; review-ui: 5 requirements / 6 scenarios; combined 12/14) is analyzed in the Spec Compliance Matrix section below, distinct from this attestation scope.
**apply-progress artifact**: not retrievable from Engram this session (mem_search/mem_get_observation returned nothing under sdd/direct-db-integration/apply-progress for this project - consistent with the engram_tooling_gap already logged twice in state.yaml for this change). Verification below is based on independent reproduction: actual repository files/tests, git history at commit granularity, tasks.md inline notes, the work_unit_2_result block in state.yaml, gh pr view 3, and live command execution - not on any apply-phase self-report text.

---

## Reproduction Summary (independently re-run in this environment)

| Check | Command | Result |
|---|---|---|
| Working tree / branch | git status, git branch -a, git log --oneline -20 | On feat/domain-rules, up to date with origin/feat/domain-rules, working tree clean; matches claimed branch |
| Dependency install | npm install | Clean, 284 packages, 0 vulnerabilities |
| Domain test suite | npm test -- src/domain | 9 files, 36/36 passed - matches claim exactly |
| Full test suite | npm test | 10 files, 37/37 passed (36 domain + 1 pre-existing smoke) - matches claim exactly |
| Type check | npm run typecheck | Clean, no errors |
| Build | npm run build | tsc clean + vite build succeeds (dist/web/index.html, dist/web/assets/*) |
| PR metadata | gh pr view 3 --json ... | OPEN, feat/domain-rules to feat/archive-and-scaffold; body matches claimed scope/file table/deviations verbatim |
| Diff size | git diff --stat feat/archive-and-scaffold...feat/domain-rules | src/domain/: 21 files, 675 insertions (exact match to claim); full diff incl. SDD tracking files: 24 files, 881(+)/13(-) = 894 total (claim said 887, a 7-line drift, immaterial, likely branch-tip movement since the PR body was written) |
| Commit message / PR body AI-attribution scan | git log across all commits on branch, gh pr view 3 body/title | Zero Co-Authored-By trailers, zero "Generated with Claude" footers, zero session links. Two literal occurrences of the word Claude in commit/task text are legitimate references to archive/README.md documenting that the v5 UI artifact only ever lived inside Claude.ai own artifact system, not AI-authorship attribution. Constraint satisfied. |
| Git history buildability (new finding, see Issues) | git show COMMIT:src/domain/normalize.ts at each pre-refactor commit | fatal: path exists on disk, but not in COMMIT, at all 5 pre-refactor commits, while those same commits dedupe.ts/fa-propagation.ts/catalog-resolution.ts already import from ./normalize.js |

---

## Task-by-Task Verification

| Task | Claimed | Verified | Notes |
|---|---|---|---|
| 2.1 dedupe.ts | [x] RED+GREEN | Confirmed, genuine implementation | checkDuplicate normalizes both sides via normalizeBranchRep and does a live-catalog membership check; 5 table-driven cases incl. case-insensitivity, whitespace-padding, and an empty-catalog edge case. Not a stub. |
| 2.2 fa-propagation.ts | [x] RED+GREEN | Confirmed | propagateFaByBranchRep builds a per-group resolved-FA map and never overwrites an already-resolved entry. 3 cases incl. a same-group / different-group / all-unresolved-group split; real behavioral variance, not trivial. |
| 2.3 parsing pershing.ts and ubs.ts | [x] RED+GREEN, DEVIATION/RISK noted | Confirmed, deviation honestly reported | Both files carry an explicit in-file DEVIATION / RISK doc comment stating the real gestion-fa-codes-sql skill is absent from disk (cross-references task 0.2) and that the fixed-width-4+4 (Pershing) / slash-separated (UBS) rules are best-effort placeholders requiring validation against real MR data before Phase 7. tasks.md 2.3 repeats the same note. Caveat: only the raw-string-splitting functions exist; nothing in this unit selects Pershing vs UBS vs generic based on Origin, so the literal spec scenario wording is not yet reachable end-to-end; correctly out of scope for a no-I/O unit, but worth naming explicitly. |
| 2.4 catalog-resolution.ts | [x] RED+GREEN | Confirmed | resolveCatalogValue does exact-match-first, then normalizeForMatch fallback (case/whitespace/diacritic-insensitive, verified via a literal Sao Paulo diacritic-stripping test case, not a trivial ASCII-only check). 5 cases incl. empty catalog. |
| 2.5 status.ts | [x] RED+GREEN | Confirmed | deriveFieldStatus implements the 4-state precedence exactly as spec'd (no-data wins over a stray match status, tested explicitly by the 5th case: hasRawValue false plus matchStatus exact still yields no_data). Genuine precedence/edge-case test, not tautological. |
| 2.6 false-company.ts | [x] RED+GREEN, NOTE on scope vs AnalysisAdvisor | Confirmed, deviation is real and correctly scoped | isFalseCompanyMatch is a case-insensitive substring pre-filter over a small default pattern list, with a caller-overridable pattern list (tested separately). In-file doc comment and tasks.md both correctly describe this as complementary to, not a replacement for, design.md optional AnalysisAdvisor LLM port. |
| 2.7 unidentified.ts | [x] RED+GREEN | Confirmed | resolveToUnidentifiedPlaceholder / isUnidentifiedPlaceholder implement the generic placeholder with isGenericPlaceholder true distinct marking, per spec. 4 cases. |
| 2.8 types.ts BatchAnalysis Zod schema | [x] | Confirmed | Full Zod schema for the PRD v5 section 6 contract (8 resolution fields, fa array, faDiscarded array, references array, alerts array), contractVersion defaulted for legacy and explicit for live output. Two golden fixture files round-trip through safeParse with field-level assertions (not just success true), plus a negative case (missing codes rejected). Real contract-layer test, not a smoke test. |
| 2.9 REFACTOR normalize.ts | [x] RESOLVED | Confirmed as a final-state extraction; git-history claim not fully supported, see Issues | normalize.ts exists, exports normalizeBranchRep and normalizeForMatch, and is genuinely the single source of truth consumed by dedupe.ts, fa-propagation.ts, catalog-resolution.ts in the final tree (independently re-run: all 36 domain tests plus typecheck plus build green on HEAD). However the commit graph does not support the "stayed green throughout" framing at commit granularity, see Warning findings below. |

---

## Correctness (Static + Runtime Evidence)

| Requirement (domain-layer scope) | Status | Notes |
|---|---|---|
| Same Branch+Rep Implies Same FA (fa-assignment) | Implemented, tested | fa-propagation.test.ts, 3 real cases |
| Format-Specific Resolution Rules (fa-assignment) | Partially implemented | Parsers exist and are tested in isolation; no dispatcher selects between Pershing/UBS/generic by Origin yet (expected, that wiring belongs to a later phase, but the parsing rule is not literally "applied instead of the generic default" yet) |
| False-Company Detection Alert (fa-assignment) | Domain building block only | Heuristic function implemented/tested; "visible alert attached, distinct from ordinary status indicators" is a UI requirement, Phase 6 |
| Generic Unidentified Placeholder (fa-assignment) | Domain building block only | Placeholder resolution function implemented/tested; "user accepts the placeholder" is a UI interaction, Phase 6 |
| Accessibility-Safe Status Encoding (review-ui) | Domain building block only | deriveFieldStatus produces the 4 canonical status values correctly; texture/color/glyph encoding and legend-filter behavior are UI, Phase 6 |
| FA Existing/New Resolution Modes, Alternatives and Discarded-Candidate Reactivation, Override Marking and Restore (fa-assignment) | Not started | UI/API concerns, correctly out of scope for this unit |
| Live Batch Table Rendering, Per-Row Fingerprint Summary, Per-Field Drawer, Batch Load Failure Blocks Rendering (review-ui) | Not started | UI/API/I-O concerns, correctly out of scope for this unit |

This matches the unit's own stated scope (no I/O, no API, no UI) and is not treated as under-delivery; it is the honestly-reported difference between "domain logic prerequisite exists and is tested" and "spec scenario is end-to-end satisfiable," which is exactly what this verification was asked to check.

---

## Spec Compliance Matrix (full end-to-end scenario compliance, strict definition)

Recounted directly from openspec/changes/direct-db-integration/specs/fa-assignment/spec.md and specs/review-ui/spec.md (the two specs Phase 2 task annotations reference). Note: fa-assignment actually has 7 requirements / 8 scenarios, not the 6/7 the Work Unit 1 report stated; see Issues/SUGGESTION below. This report uses the corrected count.

| Spec | Requirements | Scenarios |
|---|---|---|
| fa-assignment | 7 | 8 |
| review-ui | 5 | 6 |
| Total (in scope of this unit's task annotations) | 12 | 14 |

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Same Branch+Rep Implies Same FA | Shared BranchRep proposes a consistent FA | fa-propagation.test.ts (domain-layer only, no live batch/UI wiring) | PARTIAL (domain layer proven; full scenario needs Phase 5/6) |
| Format-Specific Resolution Rules | Pershing-format BranchRep parsed correctly | parsing/pershing.test.ts (parser only, not selected by Origin) | PARTIAL |
| False-Company Detection Alert | False-company pattern triggers an alert | false-company.test.ts (heuristic only, no UI alert) | PARTIAL |
| Generic Unidentified Placeholder | Field resolved to generic placeholder | unidentified.test.ts (function only, no UI interaction) | PARTIAL |
| Accessibility-Safe Status Encoding | Status is distinguishable without color / Legend is filterable | status.test.ts (status derivation only, no rendering) | PARTIAL for the status half, UNTESTED for the legend-filter half (pure UI) |
| All other requirements listed above (8 of 12) | -- | none, correctly out of scope | UNTESTED (by design, not a gap) |

Compliance summary: 0/14 scenarios are fully end-to-end COMPLIANT under the strict rule that a spec scenario is compliant only when a covering test passed at runtime for the complete scenario, not for a sub-behavior of it. This is the expected, honestly-scoped outcome for a domain-only unit and is not a CRITICAL finding, because tasks.md, the PR body, and state.yaml all state this scope explicitly and never claim scenario-level completion for Phase 2. 5 of 14 scenarios have a genuine, passing domain-layer prerequisite test (marked PARTIAL above); the remaining 9 have no covering test yet because their implementation has not started, also by design.

---

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | Partial | No separate apply-progress artifact retrievable this session (Engram gap, matches WU1). tasks.md inline annotations and state.yaml work_unit_2_result.tdd_mode field serve as the substitute self-report; both exist and are specific enough to cross-check. |
| All tasks have tests | Yes | 9/9 domain tasks (2.1-2.8) have a dedicated test file; 2.9 is REFACTOR-only by design (no new test file expected) |
| RED confirmed (tests exist) | Yes | 9/9 test files verified present and non-trivial on disk |
| GREEN confirmed (tests pass) | Yes | 37/37 tests pass on independent re-run (36 domain + 1 smoke) |
| Triangulation adequate | Yes | Every task has 3-5 table-driven cases with real value variance, not all-same-trivial-value cases |
| Safety Net for modified files (2.9) | Claimed but not literally provable from git history | See Warning finding below |

TDD Compliance: 5/6 checks fully passed, 1 downgraded to partial (see finding below)

---

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 37 | 10 | Vitest 3.2.7 |
| Integration | 0 | 0 | not installed yet (Phase 3+) |
| E2E | 0 | 0 | not installed yet (Phase 7) |
| Total | 37 | 10 | |

All Phase 2 tests are pure unit tests against exported functions, no render, no HTTP, no I/O, consistent with the "no runtime harness needed" forecast in tasks.md Suggested Work Units table for this unit.

---

### Changed File Coverage

No coverage tool is installed (package.json has no --coverage script, no coverage dependency), consistent with Work Unit 1's report and openspec/config.yaml coverage_threshold 0. Coverage analysis skipped, no coverage tool detected (informational, not a failure).

Manual inspection: every exported function in dedupe.ts, fa-propagation.ts, catalog-resolution.ts, status.ts, false-company.ts, unidentified.ts, and types.ts has at least one direct covering test case exercising both a positive and a negative/edge branch (see Task-by-Task table). normalize.ts has no direct test file, but both its exported functions are exercised indirectly through every test in dedupe.test.ts, fa-propagation.test.ts, and catalog-resolution.test.ts.

---

### Assertion Quality

Scanned all 9 domain test files line-by-line for the banned patterns: tautologies, orphan empty-only checks, type-only-alone assertions, ghost loops over possibly-empty collections, smoke-test-only patterns, mock-heavy ratios.

Assertion quality: all assertions verify real behavior. No tautologies, no ghost loops (no for/forEach over query results in any domain test), no vi.mock() usage at all (pure functions need none), no CSS/implementation-detail coupling (these are not component tests). Every it.each table has genuine outcome variance across rows: status.test.ts row 5 specifically tests a precedence edge case, catalog-resolution.test.ts tests real diacritic-stripping with a non-ASCII fixture (Sao Paulo), false-company.test.ts tests both default-pattern and custom-pattern-override code paths.

---

### Quality Metrics

Linter: not available, no lint script configured, consistent with Work Unit 1.
Type Checker: no errors, tsc -p tsconfig.json --noEmit, independently re-run, clean.

---

## PR Verification

| PR | Base to Head | State | Base-ref correct? |
|---|---|---|---|
| 3 (Work Unit 2) | feat/archive-and-scaffold to feat/domain-rules | OPEN, not draft | Correctly targets the immediate previous work-unit branch (Unit 1), per feature-branch-chain strategy in state.yaml, not main and not the tracker branch |

Chain diagram in the PR body correctly places this PR as unit 2 of 8 in the declared chain and correctly lists the still-open PR 2 (Unit 1) as a prerequisite.

---

## Issues Found

### CRITICAL
None. All 9 tasks are genuinely implemented (no stubs), all claimed test/build/typecheck results independently reproduced exactly, zero AI/Claude attribution found anywhere, and no spec requirement is silently over-claimed as complete.

### WARNING
1. Task 2.9 REFACTOR git history is not commit-by-commit buildable, so "stayed green throughout" is not literally provable. Independently verified: at commit 7eb5309 (the first domain commit, "add BranchRep dedupe and FA propagation rules"), dedupe.ts already contains an import of normalizeBranchRep from ./normalize.js, but src/domain/normalize.ts does not exist in that commit (confirmed via git show 7eb5309:src/domain/normalize.ts, which returns "fatal: path exists on disk, but not in 7eb5309"). The same is true for fa-propagation.ts at 7eb5309 and catalog-resolution.ts at e4d0be2; both already import from ./normalize.js before normalize.ts is created 5-6 commits later in 65bca37. Practically this means: (a) checking out any commit between 7eb5309 and 65bca37 in isolation would fail module resolution, so the individual commits do not represent a genuinely bisectable, independently-buildable RED-GREEN-REFACTOR history; (b) the 65bca37 commit message claim that "all 36 domain tests and the project typecheck stay green with no behavior change" can only be true of the final working-tree state, not of the sequence of commits as landed. This is a process/commit-hygiene issue, not a functional defect; the final HEAD state is fully green and was independently re-verified in this session; but the git history cannot be used as literal proof that TDD's RED/GREEN/REFACTOR cycle was followed commit-by-commit for 2.9, only as proof of the end state.
2. Format-Specific Resolution Rules (fa-assignment) has no dispatcher yet. parsePershingBranchRep and parseUbsBranchRep exist and are tested standalone, but nothing in this unit selects between them (or the generic default) based on a code's Origin field, so the literal spec scenario wording ("the Pershing-specific parsing rule is applied instead of the generic default") is not reachable end-to-end yet. This is consistent with the unit's declared no-I/O scope (the dispatcher likely belongs with catalog/Origin resolution in a later phase) and is not flagged as a gap in tasks.md, but was not called out as a caveat there either; worth tracking forward so a later phase's task list explicitly includes wiring Pershing/UBS/generic selection by Origin.
3. Work Unit 1's verify-report.md undercounted the fa-assignment spec (stated 6 requirements / 7 scenarios; recounting specs/fa-assignment/spec.md directly gives 7 requirements / 8 scenarios; "Override Marking and Restore" and its one scenario were omitted from that earlier count). Does not affect WU1's PASS verdict (WU1 correctly reported 0/N regardless of N), but downstream verify units should use the corrected 7/8 count for fa-assignment.

### SUGGESTION
1. Consider recording the Format-Specific dispatcher gap (Warning 2 above) as an explicit follow-up task under Phase 5 or 6 in tasks.md, rather than leaving it implicit.
2. If future refactor tasks want git history itself to serve as verifiable TDD evidence (not just the final tree state), commit the extraction target file (for example normalize.ts) in the same commit as its first consumer, or verify every intermediate commit is green before pushing.

---

## Design Coherence

| Decision | Followed? | Notes |
|---|---|---|
| design.md Decision 1, hybrid split by determinism (deterministic rules in domain/, fuzzy judgment behind optional AnalysisAdvisor) | Yes | All 9 Phase 2 modules are pure, deterministic TS with zero external dependencies beyond zod; false-company.ts in-file doc comment explicitly and correctly distinguishes its cheap deterministic pre-filter from AnalysisAdvisor's fuzzy judgment rather than conflating the two |
| design.md Testing Strategy, Contract layer (golden fixtures round-tripping legacy plus live JSON) | Yes | types.test.ts plus two fixture files implement exactly this |
| design.md File Changes table (src/domain/*) | Yes | All listed files present; normalize.ts is an unlisted-but-reasonable internal extraction, not a design deviation |

---

## Verdict

PASS WITH WARNINGS

Work Unit 2 (Phase 2 domain rules, tasks 2.1-2.9) is genuinely and completely implemented: all 9 tasks produce real, non-stub, pure-function logic with real Zod-schema/golden-fixture contract coverage; all claimed test (36/36 domain, 37/37 full suite), typecheck, and build results were independently reproduced exactly; the branch, commit history, and PR 3 base-ref (feat/domain-rules to feat/archive-and-scaffold) all match the claims; zero AI/Claude attribution was found anywhere in commits or the PR body; both documented deviations (Pershing/UBS placeholder parsing, false-company heuristic scope vs AnalysisAdvisor) are honestly and consistently reported across tasks.md, state.yaml, and the PR body; and the unit's own no-I/O/no-UI scope is honestly reflected in the spec compliance matrix (0/14 full end-to-end scenarios, as expected and declared, not silently over-claimed) with 5/14 scenarios showing genuine, tested domain-layer prerequisite support. Two WARNING-level findings, the non-bisectable git history around the 2.9 refactor claim, and the not-yet-wired Format-Specific dispatcher, do not block the work, do not indicate any functional defect in the shipped code, and are forward-trackable rather than regressions to fix now. No CRITICAL issues were found.

---

## Key Learnings

1. dedupe.ts and fa-propagation.ts at commit 7eb5309 already import from ./normalize.js, six commits before normalize.ts is created in 65bca37, so those intermediate commits are not independently buildable.
2. All 675 changed lines under src/domain/ in the feat/archive-and-scaffold to feat/domain-rules diff match the PR body's stated diff size exactly.
3. specs/fa-assignment/spec.md actually defines 7 requirements and 8 scenarios, one more of each than Work Unit 1's verify report counted.
4. Zero of the 14 relevant spec scenarios are fully end-to-end compliant yet, which is the expected and honestly-declared outcome for a domain-only, no-I/O work unit.
5. parsePershingBranchRep and parseUbsBranchRep exist and are tested standalone but nothing yet selects between them by a code's Origin field.

---

# Verification Report: direct-db-integration - Work Unit 3 (Phase 3, Ports + MCP Client Adapter)

**Change**: direct-db-integration
**Scope**: tasks 3.1-3.6 only (Work Units 1-2 already verified separately)
**Branch**: feat/ports-mcp-client (base feat/domain-rules), PR #4 (open, confirmed via gh pr view 4)
**Envelope note**: the strict machine-readable envelope above reports requirements 1/1 and scenarios 1/1 because only the Internal-Identity Authentication requirement (spec mcp-client) is fully end-to-end complete at Phase 3 scope -- it has zero UI component, is entirely client-side, and is integration-tested. The other 3 mcp-client requirements (Live Read via MCP Tools, Read Failure Blocks the Affected Batch, Explicit Empty-State Rendering) each have a genuine, passing client-adapter-layer test now, but their requirement text also names UI-rendering behavior (visible error message, distinct empty-state indicator, no indefinite spinner) that belongs to a later phase, so they are not claimed as full end-to-end complete in this strict envelope. The full informational matrix, including these 3 partially-complete requirements, is in the Spec Compliance Matrix section below, consistent with the precedent set by the Work Unit 2 verify report for this same change.
**Mode**: Strict TDD

### Completeness
| Metric | Value |
|--------|-------|
| Phase 3 tasks total | 6 |
| Phase 3 tasks complete | 6 (3.1-3.6 all [x]) |
| Phase 3 tasks incomplete | 0 |

### Build & Tests Execution (independently re-run, not trusted from apply report)
**Build**: PASSED
```text
npm run build
tsc -p tsconfig.json && npm run build:web
vite build -> 27 modules transformed, dist/web/ emitted, built in 1.96s
```
**Typecheck**: PASSED - npm run typecheck (tsc -p tsconfig.json --noEmit) - zero output, zero errors.

**Tests**: 65 passed / 0 failed / 0 skipped (14 files)
```text
npm test -- src/mcp   -> 4 files, 28 passed
npm test (full suite) -> 14 files, 65 passed
```
Both figures match apply's self-report exactly (28/28 scoped, 65/65 total).

### TDD Compliance
| Task | RED | GREEN | TRIANGULATE | SAFETY NET |
|------|-----|-------|-------------|------------|
| 3.3 yhat-client.ts (config/host-allowlist/retry) | Written: new file; test imports ./yhat-client.js before it existed | Passed: 13/13 yhat-client.test.ts cases pass now | 13 cases across config, allowlist, validation, retry | N/A (new) |
| 3.4 timeout/error-kind mapping | Written: same file, new | Passed: retry+timeout tests pass | network-retry unit test + integration timeout test (2 distinct paths) | N/A (new) |
| 3.5 Zod validation + admin boundary | Written: new files | Passed: 7 entity-query + 2 admin-boundary cases pass | 9 cases, varied expected values (accept/reject/reject/reject) | N/A (new) |
| 3.6 integration test | Written: new file (stub + integration test committed together) | Passed: 6/6 integration cases pass | success/tool-error/empty/timeout/auth - 5 distinct outcome kinds | N/A (new) |

**TDD Compliance**: 4/4 tasked RED+GREEN items have complete, cross-referenced evidence.

**Limitation of this audit**: tests and implementation were committed together in each commit (e.g. commit 4f98092 adds both yhat-client.ts and yhat-client.test.ts in one commit), so true RED-state cannot be replayed from git history alone. Verification relies on: (a) the technical plausibility of the claim (new files, tests import modules that could not have resolved beforehand), (b) a real bug the process caught and fixed being visible in the final code (see below), and (c) exact reproduction of the reported GREEN state. This is a process-transparency limitation, not a contradiction - the same limitation applies to Work Units 1-2 in this session.

**entity-query.ts test-order deviation**: apply self-reported writing this Zod schema before its own test file, explicitly not RED-first, while noting it is a shared dependency (not itself a tasked RED+GREEN item - tasks.md tags 3.3/3.4/3.5 as RED+GREEN, not 3.1/3.2, and 3.5 RED+GREEN evidence is the validation-before-wire-call behavior in yhat-client.ts/admin-tool-boundary.test.ts, which was RED-first). Judgment: honest and reasonable, not a process gap - a passive schema declaration has no meaningful RED state to prove, and the disclosure was proactive and precise rather than glossed over.

**Assertion Quality**: All assertions in all 4 new test files verify real behavior. No tautologies, no ghost loops, no smoke-test-only patterns, no mock-heavy tests found. Every test calls production code (safeParse, queryEntities, isAllowedTargetHost, resolveYhatMcpClientConfig) and asserts a specific, varied expected value (rows returned, specific error kind, elapsed-time bound, header value, empty array alongside a companion non-empty-rows test in the same file).

### IPv6 host-parsing bug - verified fixed and tested
normalizeHost() in yhat-client.ts explicitly counts colons before stripping a trailing :port (colonCount === 1 ? strip : leave-as-is), with an inline comment explaining why (::1 has multiple colons and no attached port). yhat-client.test.ts line 78 (isAllowedTargetHost("::1", "mcp.internal.yhat") -> true) exercises exactly this case. Confirmed not a silent/undocumented workaround.

### StreamableHTTPClientTransport cast - verified honestly documented
yhat-client.ts lines 180-188: a 6-line comment explains precisely why the SDK's own transport class does not structurally satisfy its own Transport interface under exactOptionalPropertyTypes: true (an undefined-vs-absent-optional-property mismatch), then a narrow, scoped cast (transport as Parameters<Client["connect"]>[0]) - not a blanket "as any", not silent. Judgment: acceptable, non-blocking, matches the narrow commented cast claim.

### Security boundary (admin-tool reachability) - independently verified
- admin-tool-boundary.test.ts regex /\byhat_query\b/ correctly does not false-positive-match yhat_query_entities (both the y before _query end and the following _ are word characters, so no \b boundary exists there) - confirmed this is a meaningful, non-tautological check, not a check that would pass regardless of the code under test.
- Independent repo-wide grep for yhat_query outside yhat_query_entities in src/ found exactly 3 matches, all in the test file itself and one doc-comment in YhatReadPort.ts describing the boundary - zero references to the raw admin tool in any executable non-test path.
- YhatReadPort interface has no method mapping to yhat_query; QUERY_ENTITIES_TOOL_NAME is the only tool name constant exported and the only one ever passed to client.callTool.

**Verdict**: the security boundary claim is real and meaningfully tested, not tautological.

### entity-query.ts schema fidelity - one real, minor gap found (not previously disclosed)
Cross-checked entityQuerySchema against yhat-mcp-server's actual entityQueryInputSchema (sibling repo src/server.ts:79-87, read directly). filters/orderBy/limit/attributes/entity match exactly. One field diverges: the real server schema has an additional optional aggregates field (z.array(z.string()).optional()) that facodes' entityQuerySchema omits entirely. Since Zod's default .object() behavior strips unrecognized keys during safeParse (not .strict()), a caller that ever passes aggregates would have it silently dropped before the wire call rather than rejected or forwarded - not currently a bug in practice (nothing in src/ uses aggregates yet, Phase 3 has no caller of queryEntities beyond tests), but the "mirrors yhat-mcp-server's own schema" claim in code comments and tasks.md is not 100% exact. WARNING, not CRITICAL.

### Task 3.2 (Docker network) - independently re-confirmed
- Re-read yhat-mcp-server's actual docker-compose.yml directly: confirmed it declares no networks block at all - only the implicit Compose default network, publishing 127.0.0.1:3000:3000 (host-loopback only). The yhat-mcp-proxy service (profile ec2, Caddy, port 443) matches facodes' documented production path claim exactly.
- facodes' docker-compose.yml no longer contains any networks block or yhat-internal network reference (only a comment documenting why it was removed).
- env.example documents the real HTTP(S) connection path (YHAT_INTERNAL_HOST, optional YHAT_MCP_URL override) without asserting any specific unconfirmed dev-network name - the two documented local-dev options are phrased generically (a manually-created shared Docker network), not as an existing fact. Honest, not overstated.
- design.md's own Open Questions section already flagged the network name as an unconfirmed assumption (assumed yhat-internal; the sibling repo's compose file is not in the local checkout) - so this is a design-anticipated correction, not an undisclosed deviation from design.md.

### Cross-repo forward-tracked risk - independently verified accurate
Read yhat-mcp-server/src/http-bootstrap.ts directly: INTERNAL_IDENTITY_VALUE is set to the literal string yhat-internal as a hardcoded constant used by authorizeInternalMcpRequest, exactly as apply's forward-tracked risk describes. Confirmed accurate, correctly non-blocking for this unit (masked by Caddy's header_up override in production), correctly scoped as a yhat-mcp-server-side concern rather than a facodes task.

### AI Attribution Check (hard constraint)
- git log feat/domain-rules..feat/ports-mcp-client (5 commits) - zero matches for claude|anthropic|co-authored|generated with|ai-generated.
- gh pr view 4 body (full text) - zero matches for the same pattern.
- git diff feat/domain-rules...feat/ports-mcp-client (full diff content, all 15 files) - zero matches.
- Result: CLEAN. No AI/Claude attribution found anywhere in this work unit's commits, PR body, or diff content.

### Spec Compliance Matrix (mcp-client delta spec)
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Live Read via MCP Tools | Batch data is fetched live | (none - requires batch orchestration/UI, not yet built) | DEFERRED (correctly out of Phase 3 scope; low-level call capability exists and is integration-tested, but no orchestration wires a real batch load to it yet) |
| Internal-Identity Authentication | Connection is established with the internal-identity header | yhat-client.integration.test.ts: sends the configured x-yhat-internal-identity header on every call | COMPLIANT |
| Read Failure Blocks the Affected Batch | MCP call fails | yhat-client.integration.test.ts: error: a tool-level error response is surfaced as kind:tool_error, never partial rows | PARTIAL (client contract COMPLIANT and tested; UI-level visible-error-message rendering is later-phase scope, not yet built) |
| Read Failure Blocks the Affected Batch | MCP call times out | yhat-client.integration.test.ts: timeout: a hung tool call is bounded by the configured timeout, never indefinite | PARTIAL (client contract COMPLIANT and tested; UI-level indefinite-spinner-avoidance rendering is later-phase scope, not yet built) |
| Explicit Empty-State Rendering | Query returns zero records | yhat-client.integration.test.ts: empty-result: a successful call with zero rows resolves to [] without throwing | PARTIAL (client contract COMPLIANT and tested; UI-level distinct visual indicator is later-phase scope, not yet built) |

**Compliance summary**: 1/5 scenarios fully end-to-end COMPLIANT (Internal-Identity Authentication -- the only mcp-client requirement with zero UI component). 3/5 scenarios are PARTIAL: a genuine, passing client-adapter-layer test exists now, but the requirement text also names UI-rendering behavior that is later-phase scope (Phase 6/7) and not yet built. 1/5 (Live Read via MCP Tools) is DEFERRED -- no batch-orchestration wiring exists yet to exercise the call end-to-end. This matches the strict envelope above (1/1), which counts only the fully end-to-end complete requirement/scenario, consistent with the Work Unit 2 precedent of not claiming partial UI-dependent credit in the machine-readable attestation.

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Port interfaces match design.md Interfaces/Contracts | Implemented | YhatReadPort/ReviewStateStore/AnalysisAdvisor verbatim-equivalent to design.md, with reasonable additive types (FieldOverride, WritePlan) design.md itself names in the sequence diagram |
| x-yhat-internal-identity header on every call | Implemented | Sent unconditionally in StreamableHTTPClientTransport's requestInit.headers; integration-tested |
| Client-side Host allowlist | Implemented | isAllowedTargetHost + resolveYhatMcpClientConfig fail fast on misconfigured YHAT_MCP_URL; unit-tested including IPv6 |
| Retry/timeout bounding | Implemented | withRetries retries only timeout/network kinds, bounded maxAttempts; integration-tested for bounded timeout |
| Zod validation before wire call | Implemented | entityQuerySchema.safeParse runs before connect()/callTool(); unit-tested with a fetch spy asserting zero invocations |
| Admin-tool boundary | Implemented | No reachable reference to raw-SQL admin tool outside test/doc-comment context; structurally tested |
| Docker network fix (3.2) | Implemented | Verified against sibling repo directly |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Decision 3 (TypeScript end to end, modelcontextprotocol/sdk Streamable HTTP client) | Yes | |
| System Architecture (container-to-container MCP over HTTP, x-yhat-internal-identity gate) | Yes, with correction | design.md's diagram line "docker network: yhat-internal" is now stale (design.md itself was not updated), but design.md's own Open Questions section already flagged this exact assumption as unconfirmed - not a real deviation, an anticipated correction. SUGGESTION: update design.md's System Architecture diagram/prose to drop the now-disproven yhat-internal external network line, for future readers who will not see tasks.md's inline note. |
| Threat Matrix boundary (Zod validation, yhat_query never exposed) | Yes | |
| Interfaces/Contracts | Yes | |

### Issues Found
**CRITICAL**: None

**WARNING**:
1. entity-query.ts's entityQuerySchema omits the real server's aggregates optional field - a caller-passed aggregates value would be silently stripped before the wire call rather than rejected/forwarded. Not currently exercised anywhere in src/, so non-blocking today; flag before any future caller needs aggregates.
2. True RED-first git-history replay is not possible for any Phase 3 task because tests and implementation are committed together per task; verification relies on technical plausibility, the internally-consistent bug-fix narrative, and exact reproduction of the reported GREEN state, not a literal RED commit. (Same limitation applies uniformly across this session's work units.)

**SUGGESTION**:
1. design.md's System Architecture section still shows "docker network: yhat-internal (declared external: true by facodes)", which task 3.2 disproved. design.md's own Open Questions section already flagged this as unconfirmed, so this is not a real deviation, but updating the diagram would prevent future confusion for anyone reading design.md without tasks.md's inline note.
2. Diff-size accounting drifted slightly (1229 claimed vs. 1236 actual insertions+deletions at time of this verify, due to a later "record PR #4 link" commit adding about 7 more lines to state.yaml after the budget note was written) - cosmetic only, does not change the size:exception decision already recorded.

### Verdict
**PASS WITH WARNINGS**

All 6 Phase 3 tasks (3.1-3.6) are complete, independently re-verified against source. Build, typecheck, and full test suite (65/65) all pass on independent re-run, matching apply's self-report exactly. The security boundary (admin-tool unreachability), internal-identity header, host allowlist, retry/timeout bounding, and Zod-validation-before-wire-call are all genuinely implemented and meaningfully tested - not stubbed, not tautological. Zero AI attribution found anywhere. Two non-blocking WARNINGs (a real but currently-unused schema-fidelity gap; an inherent git-history RED-replay limitation) and two SUGGESTIONs (stale design.md diagram line; cosmetic line-count drift) keep this from a clean PASS, but nothing here blocks proceeding to Work Unit 4.

---

## Key Learnings

1. All 6 Phase 3 tasks and 28 new tests were independently reproduced exactly: 28/28 scoped and 65/65 full suite, matching apply's self-report precisely.
2. The admin-tool-boundary regex correctly avoids a false-positive match against yhat_query_entities due to word-boundary semantics around the trailing underscore.
3. yhat-mcp-server's entityQueryInputSchema includes an aggregates field that facodes' entityQuerySchema omits, a real but currently-unused schema-fidelity gap.
4. yhat-mcp-server hardcodes its expected internal-identity header value as the literal constant yhat-internal, confirming apply's forward-tracked cross-repo risk.
5. Only the Internal-Identity Authentication requirement is fully end-to-end complete at Phase 3 scope; the other three mcp-client requirements have UI-rendering components deferred to a later phase.

---
```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:3166930f0e7fa4f9dcac1d2f3af0f7cf70cc318b8f6f9f0f5f6a5a3a1e0b0c0d
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 1/1
scenarios: 1/1
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:7e5bfa4bd762df28911d2eaeeb335c0e2baa65b433684671b9af9bcd073c0b93
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:f5982bbccacf9223b55d702baf0b502f6a861a48f447386d2a6a68e9d15ce60b
```

```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:2ead63b2ac0756351c0f1022b0d62c255390ae316b8f216c312e0c781f923b7d
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 3/3
scenarios: 3/3
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:424c7f44fbd64d38bebbbb7862e2a348bbfa0ebb04c8d6e71802c6602057cb3c
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:d94cc60cee191e15725485b8f76d535c350f2e34bb48bfd1025310392e9d3e98
```
# Verification Report: direct-db-integration - Work Unit 4 (Phase 4, SQLite Store)

**Change**: direct-db-integration
**Scope**: Work Unit 4 ONLY - Phase 4 (SQLite Store), tasks 4.1-4.7
**Branch**: feat/sqlite-store (base feat/domain-rules, which now contains Phase 2+3 merged via PR #4), PR #5 (open, confirmed via `gh pr view 5`)
**Mode**: Strict TDD
**Envelope note**: the strict machine-readable envelope above reports requirements 3/3 and scenarios 3/3 because it counts only the requirements fully end-to-end COMPLIANT for this unit (Restart Survival, Durable Override Writes, Batch Retrieval by Reference), consistent with the counting convention already used in the Work Unit 2 and Work Unit 3 envelopes for this same change. The full informational scope this unit touches is 5 requirements / 5 scenarios (4 from persistence, 1 from write-confirmation); the remaining 2 (Single-User Scope, Two-Step Explicit Confirmation) are analyzed separately in the Spec Compliance Matrix below as DOCUMENTED and PARTIAL respectively, distinct from this attestation scope.
**apply-progress artifact**: not retrievable via Engram this session - `mem_search`/`mem_get_observation`/`mem_save` and every other `mem_*` tool were absent from this agent's tool inventory (Read, Grep, Glob, Bash only), the same recurring gap independently logged for every prior apply/verify session on this change (see `engram_tooling_gap` entries in `state.yaml`). Verification below is based on independent reproduction: actual repository files, `git log`/`git show` at commit granularity (including a temporary `git worktree` checkout of the pre-implementation commit to literally re-run the claimed RED state), `tasks.md` inline notes, the `work_unit_4_result` block in `state.yaml`, `gh pr view 5`, and live command execution - not on any apply-phase self-report text.

---

## Reproduction Summary (independently re-run in this environment)

| Check | Command | Result |
|---|---|---|
| Working tree / branch | `git status`, `git log --oneline -10` | On `feat/sqlite-store`, up to date with `origin/feat/sqlite-store`, working tree clean; matches claimed branch |
| Dependency install | `npm install` | Up to date, 284 packages audited, 0 vulnerabilities |
| Store test suite | `npm test -- src/store` | 1 file, 12/12 passed - matches claim exactly |
| Full test suite | `npm test` | 15 files, 77/77 passed - matches claim exactly |
| Type check | `npm run typecheck` | Clean, no errors |
| Build | `npm run build` | tsc clean + vite build succeeds (dist/web/index.html, dist/web/assets/*) |
| Diff size (implementation only) | `git diff --numstat origin/feat/domain-rules...feat/sqlite-store` (excl. state.yaml/tasks.md) | 632 changed lines (628 insertions + 4 deletions) across 9 files - exact match to the budget_note claim |
| Diff size (incl. SDD docs) | same, full diff | 724 changed lines (710 insertions + 14 deletions) across 11 files - exact match to the claim |
| PR metadata | `gh pr view 5 --json state,baseRefName,headRefName,additions,deletions,changedFiles` | OPEN, feat/sqlite-store -> feat/domain-rules, additions 710 / deletions 14 / changedFiles 11 - matches the diff numbers above exactly |
| RED-state replay (new, see below) | `git worktree add` at commit 7445d22, `npm test` inside it | Confirmed genuine RED: Cannot find module ./errors.js - the exact error text apply claimed |
| Commit message / PR body AI-attribution scan | git log across all commits on branch through a case-insensitive claude/anthropic/co-authored/generated-with/ai-generated/session grep; gh pr view 5 body through the same pattern | Commit log: zero matches. PR body: one match, but it is the literal checklist line stating attribution was scanned and found clean - a legitimate self-attestation line, not actual attribution (same pattern already accepted in the Work Unit 2 report for a legitimate mention of the word Claude in a v5-artifact-provenance context). Constraint satisfied. |

---

## Task-by-Task Verification

| Task | Claimed | Verified | Notes |
|---|---|---|---|
| 4.1 src/store/sqlite/index.ts implementing ReviewStateStore; WAL-mode better-sqlite3 connection | [x] with NOTE | Confirmed | SqliteReviewStateStore implements every method of ReviewStateStore (src/ports/ReviewStateStore.ts) with matching signatures - saveBatch, loadBatch, putOverride, savePlan, recordConfirmation - no drift between port and implementation. Constructor sets journal_mode = WAL and foreign_keys = ON. The NOTE's claim that BatchAnalysis has no top-level id field is independently confirmed by reading src/domain/types.ts: batchAnalysisSchema has contractVersion/batchNo/snapshot/codes only; only codeEntrySchema (a nested code, not the batch) has an id field. Using String(batchNo) as the batch reference is consistent with the persistence spec's own scenario wording, "a batch reference (e.g., batch number)" - re-read directly from specs/persistence/spec.md, not just the apply report's paraphrase. |
| 4.2 Numbered forward-only migrations under migrations/*.sql, applied at boot | [x] with RESOLVED note | Confirmed | 4 migration files present (0001_create_batches.sql ... 0004_create_confirmations.sql), each with a CREATE TABLE IF NOT EXISTS and a doc comment tying it back to a spec/design line. runMigrations (migrate.ts) tracks applied files in a schema_migrations table, sorts pending files, and never re-runs an already-applied one - genuinely forward-only. The Dockerfile RESOLVED note (COPY src/store/sqlite/migrations ./dist/store/sqlite/migrations) is present at Dockerfile line 53, with an inline comment explaining tsc does not copy non-.ts assets. |
| 4.3 RED+GREEN: saveBatch/loadBatch round-trip (spec persistence - Restart Survival) | [x] | Confirmed, genuine RED+GREEN | 3 real test cases (round-trip, unknown-reference returns null, re-save overwrites the previous snapshot). Not a stub - the round-trip test asserts full deep equality against the original batch object, not just a partial field. |
| 4.4 RED+GREEN: putOverride durability (spec persistence - Durable Override Writes) | [x] with NOTE | Confirmed, meaningfully tested | The durability test opens a second, independent, read-only better-sqlite3 connection to the same file immediately after awaiting putOverride, and reads the row through that second connection - genuinely proves the write is durable on disk before the promise resolves, not merely cached in this process's memory. A second test confirms the override is applied on top of the loaded batch (and that an untouched field is unaffected); a third confirms last-write-wins on a repeated override. |
| 4.5 RED+GREEN: savePlan/recordConfirmation - status transitions, planId match/expiry assertion (spec write-confirmation - Two-Step Explicit Confirmation) | [x] with NOTE | Confirmed at store-layer scope; NOTE is honest about the split | recordConfirmation throws a typed PlanConfirmationError with kind no_plan/plan_id_mismatch/plan_expired, matching errors.ts exactly, which itself cites design.md's sequence-diagram line about asserting planId matches the persisted plan and has not expired, verbatim (re-read design.md lines 94-98 directly, confirmed the quoted line is accurate, not paraphrased). 4 test cases cover: successful confirm-and-record, planId mismatch (plan stays awaiting_confirmation), expired plan (rejects with PlanConfirmationError, checked twice - once for instanceof, once for kind), and no-plan-exists. The task's own NOTE ("so Phase 5's API layer has a concrete error taxonomy to map to HTTP responses") already discloses this is groundwork for Phase 5, not a claim that the full UI/API two-step-confirmation flow is delivered - see Spec Compliance Matrix below for the precise scope boundary. |
| 4.6 RED+GREEN: batch retrieval by reference after a simulated restart (spec persistence - Batch Retrieval by Reference) | [x] | Confirmed | Two tests: (a) close the store, construct a brand-new SqliteReviewStateStore instance against the same file path, loadBatch returns the override-applied state - a faithful simulation of a process restart since the store class carries no state outside the SQLite file itself; (b) re-opening an already-migrated file does not throw (idempotent migration re-application, schema_migrations prevents re-running). |
| 4.7 Document single-writer/single-user scope (spec persistence - Single-User Scope) | [x] | Confirmed, correctly documentation-only | index.ts lines 8-18 carry an explicit doc comment: single facodes process, one database file, no optimistic-locking/conflict-detection/merge logic, putOverride/savePlan are last-write-wins by design. This matches the spec's own Single-User Scope requirement text almost verbatim ("NOT required to resolve concurrent-editing conflicts... no scenario in this spec requires conflict resolution, locking, or merge behavior"). Not RED+GREEN-tagged in tasks.md (unlike 4.3-4.6), so the absence of a dedicated test is expected, not a gap - the requirement itself is a negative/scope statement, not a positive behavior to assert against. |

---

## RED-State Replay (independently reproduced, not merely trusted from the self-report)

Unlike Work Units 2 and 3 (where tests and implementation were committed together, making true RED-state replay impossible - see those reports' WARNING findings), Work Unit 4's two Phase-4 commits are cleanly split:

- 7445d22 test(store): add SQLite ReviewStateStore round-trip and confirmation-gate tests (271 insertions, 1 file: index.test.ts only)
- 1a2d446 feat(store): implement SQLite ReviewStateStore with forward-only migrations (adds index.ts, errors.ts, migrate.ts, 4 migration SQL files, Dockerfile)

git show 7445d22:src/store/sqlite/index.ts (and errors.ts, migrate.ts) all return "fatal: path exists on disk, but not in 7445d22" - confirming the test-only commit genuinely predates any implementation file. This was reproduced live in a scratch git worktree checked out at 7445d22 (with the working node_modules copied over rather than rebuilding better-sqlite3 natively, to avoid an unrelated node-gyp/Node 24 toolchain mismatch in this environment): running vitest against src/store fails with:

Error: Cannot find module ./errors.js imported from src/store/sqlite/index.test.ts

which is the exact error text state.yaml's work_unit_4_result.tdd_mode field claims ("Cannot find module ./errors.js"). This is a genuine, bisectable RED-then-GREEN commit pair, and a concrete process improvement over the two prior work units.

---

## Spec Compliance Matrix

Re-read directly from specs/persistence/spec.md (5 requirements / 5 scenarios, one scenario each: Restart Survival, Cross-Machine Resumability, Durable Override Writes, Batch Retrieval by Reference, Single-User Scope) and specs/write-confirmation/spec.md (4 requirements / 5 scenarios: Full Write Preview Rendering, Commit Action Disabled Until Upstream Write Tools Exist x2 scenarios, Two-Step Explicit Confirmation, Approval-Request Signal Rendering). Work Unit 4's own task annotations claim 4 of the 5 persistence requirements (everything except Cross-Machine Resumability, which tasks.md explicitly forward-tracks to task 7.2's E2E container-restart test - confirmed present at that line, not silently dropped) plus 1 of the 4 write-confirmation requirements.

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Restart Survival | Overrides survive a service restart | index.test.ts round-trip/restart-survival tests | COMPLIANT - unlike the mcp-client/review-ui requirements scored in Work Units 2-3, this requirement's text names no UI/API behavior at all; it is entirely about server-side persistence, which is exactly what the store class is and what this test proves |
| Durable Override Writes | Crash immediately after confirming an override | index.test.ts second-connection durability test | COMPLIANT |
| Batch Retrieval by Reference | Retrieving a known batch after restart | index.test.ts restart-survival describe block | COMPLIANT |
| Cross-Machine Resumability | Resuming on a different machine | none in this unit (by design - forward-tracked to task 7.2) | OUT OF SCOPE for this unit, correctly not claimed anywhere in tasks.md/state.yaml for Work Unit 4 |
| Single-User Scope | No concurrent multi-user conflict handling required | in-code doc comment only, task 4.7 not RED+GREEN-tagged | DOCUMENTED, not test-covered - reasonable, since the requirement is a negative/scope statement ("no scenario requires..."), not a positive behavior a unit test can assert against |
| Two-Step Explicit Confirmation | Commit requires a separate confirmation step | index.test.ts savePlan/recordConfirmation tests (4 tests) | PARTIAL - the store-layer planId match/expiry assertion is genuinely implemented and tested; the scenario's full text ("the system first calls the planning/approval-request tool and renders its response... a subsequent, distinct confirmation action invokes the committing call") describes an API/UI orchestration sequence that does not exist until Phase 5/6, exactly as tasks.md's own Key Learning number 5 already discloses ("the write-confirmation gate spans Phase 4/5/6") |

**Compliance summary**: 3 of the 5 requirements (3 of 5 scenarios) claimed for this unit are fully end-to-end COMPLIANT under the strict rule that a scenario is compliant only when a covering test passed at runtime for the complete scenario text, not a sub-behavior of it. 1/5 is a documented negative-scope requirement with no positive test expected. 1/5 is genuinely PARTIAL (store-layer proven, API/UI orchestration deferred to later phases, honestly disclosed in tasks.md). This is a materially stronger showing than Work Units 2-3, because persistence's requirement text is written at the server/store layer directly (no UI wording), so this unit's tests close the gap almost completely rather than only proving a domain-layer prerequisite.

---

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | Partial (same Engram gap as WU1-3) | No separate apply-progress artifact retrievable this session; tasks.md inline notes and state.yaml's work_unit_4_result block serve as the substitute self-report, cross-checked against source above |
| All tasks have tests | Yes | 4/4 RED+GREEN-tagged tasks (4.3-4.6) share one dedicated test file (index.test.ts, 12 tests); 4.1/4.2/4.7 are implementation/documentation tasks with no dedicated RED+GREEN tag in tasks.md, consistent with the file's own tagging convention |
| RED confirmed (tests exist) | Yes, and independently replayed | index.test.ts verified present and non-trivial on disk; RED state additionally reproduced live via git worktree at commit 7445d22 (see RED-State Replay above) - stronger evidence than Work Units 2-3, which could only argue plausibility |
| GREEN confirmed (tests pass) | Yes | 12/12 store tests, 77/77 full suite, independently re-run in this session, exact match to claim |
| Triangulation adequate | Yes | 12 cases across 4 describe blocks, each with genuine outcome variance (mismatch vs. expired vs. no-plan all produce distinct PlanConfirmationErrorKind values; round-trip vs. unknown-reference vs. overwrite all assert different observable states) |
| Safety Net for modified files | Yes | Dockerfile is the only modified (not new) file in this unit's implementation diff; it was already exercised by Work Unit 1's cold no-cache Docker build reproduction before this change, and the change here is additive (one COPY line), non-breaking to that prior verification |

**TDD Compliance**: 6/6 checks passed

---

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit (pure functions, no I/O) | 37 | 10 | Vitest 3.2.7 (Phase 2 domain, unchanged this unit) |
| Integration (real file I/O, no mocks - store layer) | 12 | 1 | Vitest 3.2.7 + real better-sqlite3 file-backed database in a temp directory (this unit) |
| Integration (HTTP stub - MCP layer) | 6 | 1 | Vitest 3.2.7 (Phase 3, unchanged this unit) |
| Unit (MCP config/validation) | 22 | 3 | Vitest 3.2.7 (Phase 3, unchanged this unit) |
| E2E | 0 | 0 | not installed yet (Phase 7) |
| Total | 77 | 15 | |

Classification note: index.test.ts's 12 tests use a real temp-file-backed SQLite database (mkdtempSync) rather than mocks or an in-memory stub, so they are classified as integration-layer tests for the store module even though they exercise a single class, because they depend on real filesystem/SQLite I/O rather than isolated pure logic. This is a deliberate and justified departure from design.md's Testing Strategy table, which suggested :memory: SQLite for this layer (see SUGGESTION below) - :memory: mode would have made the Durable-Override-Writes test's "second independent connection to the same file" proof impossible without shared-cache URI tricks, so the real-file approach is the stronger, more honest choice for that specific scenario, not a shortcut.

---

### Changed File Coverage

No coverage tool is installed (unchanged from Work Units 1-3, openspec/config.yaml sets coverage_threshold: 0). Coverage analysis skipped, no coverage tool detected (informational, not a failure).

Manual inspection: every exported method of SqliteReviewStateStore (saveBatch, loadBatch, putOverride, savePlan, recordConfirmation, close) is exercised by at least one test; recordConfirmation's three error branches (no_plan/plan_id_mismatch/plan_expired) each have a dedicated test asserting the specific kind, not just "it throws." applyOverrides's field-not-found and non-overridable-field guard branches are not directly tested - see WARNING below.

---

### Assertion Quality

Scanned index.test.ts (the only new test file in this unit) line-by-line for the banned patterns: tautologies, orphan empty-only checks, type-only-alone assertions, ghost loops over possibly-empty collections, smoke-test-only patterns, mock-heavy ratios.

**Assertion quality**: All assertions verify real behavior. No tautologies. No mock calls at all - every test exercises a real SQLite file through better-sqlite3, including a second independently-opened connection used purely for verification in two tests (not mocked, a genuine cross-connection read). No ghost loops (no for/forEach over query results in this file). The toBeNull() check in the unknown-reference test is a specific value assertion, not a type-only check used alone. Every test block calls production code (saveBatch/loadBatch/putOverride/savePlan/recordConfirmation) and asserts a specific, varied expected value (exact override values, exact PlanConfirmationErrorKind, null vs. populated, awaiting_confirmation vs. confirmed).

---

### Quality Metrics

Linter: not available, no lint script configured, unchanged from Work Units 1-3.
Type Checker: tsc -p tsconfig.json --noEmit, independently re-run, clean, zero errors.

---

## Correctness (Static + Runtime Evidence)

| Requirement | Status | Notes |
|---|---|---|
| ReviewStateStore port fidelity | Implemented, no drift | SqliteReviewStateStore implements every method with matching signatures; the only extra method (close()) is explicitly documented as "Not part of ReviewStateStore" and is a legitimate resource-cleanup escape hatch used only by tests (and eventually the API layer's shutdown path) |
| WAL-mode connection, migrations at boot (design.md Decision 2) | Implemented | journal_mode = WAL pragma set in the constructor; runMigrations called synchronously in the constructor before any query runs |
| Durable Override Writes | Implemented, tested cross-connection | See task 4.4 above |
| planId/expiry assertion at the store layer (design.md sequence diagram) | Implemented, tested | recordConfirmation matches the design.md sequence line verbatim, confirmed by direct re-read |
| Single-writer/single-user scope documentation | Implemented | In-code doc comment, matches spec wording closely |
| Overrides re-applied on top of the saved batch (not mutating the saved row) | Implemented | loadBatch reads the raw batches.data JSON blob unchanged and applies overrides rows on top in applyOverrides, keeping saveBatch/loadBatch a pure snapshot round-trip independent of override history, as state.yaml's design_decisions_made_at_store_layer claims |

---

## Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| design.md Decision 2 - embedded SQLite (WAL, better-sqlite3), numbered migrations applied at boot | Yes | Matches exactly; the sqlite3 .backup command from Decision 2 is not yet documented in a deploy README (that is task 8.3, correctly out of this unit's scope) |
| design.md Interfaces/Contracts (ReviewStateStore) | Yes | Verbatim-equivalent, confirmed above |
| design.md Write-Confirmation Gate sequence (assert planId matches and has not expired; record the confirmation attempt) | Yes | Both lines implemented literally in recordConfirmation, confirmed by direct re-read of design.md lines 94-98 against errors.ts/index.ts |
| design.md Testing Strategy table (SQLite store layer suggested as :memory: SQLite integration test) | Partial, undisclosed but justified | Actual tests use a real temp-file-backed database, not :memory:. See SUGGESTION below - not a defect, arguably a stronger test, but not called out anywhere as an intentional deviation the way task 2.3's Pershing/UBS deviation was |

---

## Issues Found

### CRITICAL
None. All 7 tasks are genuinely implemented (no stubs), the store implements the ReviewStateStore port with zero drift, all claimed test/build/typecheck results were independently reproduced exactly (12/12 scoped, 77/77 full suite, clean typecheck, clean build), the diff-size claims (632/9 and 724/11) were independently reproduced to the exact line, PR #5 base/head refs are correct for the (evolved, merge-down) chain strategy, and zero AI/Claude attribution was found anywhere in commits or the PR body.

### WARNING
1. putOverride's field parameter is typed as a bare string (matching the ReviewStateStore port signature), and applyOverrides's guard silently drops any override row whose field is not one of the 8 known OVERRIDABLE_FIELDS on load, with no error surfaced anywhere. No test in index.test.ts exercises an invalid/unknown field value being written and then silently dropped on read. Not currently exploitable (no caller exists yet - Phase 5 has not been built), and the defensive guard is reasonable, but this edge case has zero test coverage and no CHECK constraint at the SQL layer either (migration 0002_create_overrides.sql has no such constraint). Worth adding a test and/or a validating wrapper before Phase 5 starts calling putOverride with values it does not fully control.
2. design.md's own Testing Strategy table suggests :memory: SQLite for this layer's integration tests, but the actual implementation uses a real temp-directory file-backed database instead. This is not disclosed anywhere in tasks.md, state.yaml, or the PR body as an intentional deviation (unlike, e.g., task 2.3's explicitly-flagged Pershing/UBS placeholder). Independently judged to be the better engineering choice here - :memory: mode would make the Durable-Override-Writes test's "second independent connection proves durability" assertion effectively untestable without a shared-cache URI - but future readers of design.md alone would not know this choice was made deliberately.
3. PR #5's base branch is feat/domain-rules, not feat/ports-mcp-client (Work Unit 3's own branch name), because PR #4 (Work Unit 3) was already merged into feat/domain-rules on GitHub before Work Unit 4's branch was cut. This is a legitimate "merge-down" variant of the declared feature-branch-chain strategy (each PR's diff is still correctly scoped to only that unit's new commits, independently confirmed above: 632/9 files), and state.yaml already discloses the reason (local feat/domain-rules was stale behind origin at session start, diffed/branched against origin instead). Not a defect, but the chain no longer follows the literal "each subsequent PR targets the immediate previous PR's branch name" description in state.yaml's chain_strategy field going forward - worth confirming this pattern (merge child branches down into a shared spine branch as they land, rather than always stacking on the previous unit's own branch name) is intentional before Work Unit 5 branches.

### SUGGESTION
1. Consider adding an explicit test for putOverride/applyOverrides with an unrecognized field value (see WARNING 1), even though nothing calls it with untrusted input yet.
2. Consider adding a one-line note in tasks.md task 4.3/4.4 (or design.md's Testing Strategy table) documenting the deliberate :memory: to real-temp-file test-harness deviation and why (see WARNING 2), for consistency with how other intentional deviations in this change are disclosed.
3. Consider documenting the deploy backup command (sqlite3 ... .backup, design.md Decision 2) sooner rather than deferring entirely to task 8.3, since the store/migration shape it depends on is now stable.

---

## Verdict

**PASS WITH WARNINGS**

Work Unit 4 (Phase 4 SQLite store, tasks 4.1-4.7) is genuinely and completely implemented: SqliteReviewStateStore implements the ReviewStateStore port with zero drift, all 7 tasks produce real, non-stub logic backed by a real file-backed SQLite database, and all claimed test (12/12 scoped, 77/77 full suite), typecheck, and build results were independently reproduced exactly. This unit clears a materially higher bar than Work Units 2-3 on two dimensions specifically called out as gaps in those reports: (1) its spec requirements are written at the server/persistence layer with no UI wording, so 3 of 5 in-scope persistence requirements are fully end-to-end COMPLIANT rather than merely domain-layer PARTIAL; and (2) its RED-then-GREEN commit pair (7445d22 test-only, 1a2d446 implementation) is genuinely bisectable and was independently replayed live in this session via a scratch git worktree, reproducing the exact claimed RED error (Cannot find module ./errors.js) - the first work unit in this change where TDD evidence was proven by direct reproduction rather than argued from plausibility. The diff-size claims (632 lines/9 files implementation-only, 724 lines/11 files including SDD docs) were both reproduced to the exact line. Zero AI/Claude attribution was found anywhere. Three non-blocking WARNINGs (an untested silent-drop edge case for invalid override field names; an undisclosed but justified test-harness deviation from design.md; a chain-strategy branch-basing variant that is correctly scoped but worth confirming intentional) keep this from a clean PASS, but none of them indicate a functional defect in the shipped code or block proceeding to Work Unit 5.

What could not be verified in this environment: nothing material to the store's own behavior. The two PARTIAL/DOCUMENTED spec items (Single-User Scope, Two-Step Explicit Confirmation) are correctly and honestly scoped as store-layer-only in tasks.md itself, not silently over-claimed.

---

## Key Learnings

1. git worktree add at a specific commit, with node_modules copied over rather than reinstalled, is an effective way to literally replay a claimed RED test-failure state without disturbing the main working tree - reproduced the exact claimed error text (Cannot find module ./errors.js).
2. Work Unit 4's Phase-4 commits (7445d22 test-only, 1a2d446 implementation) are the first genuinely bisectable RED-then-GREEN pair in this change, unlike Work Units 2 and 3 where tests and implementation were committed together.
3. specs/persistence/spec.md's requirement text names no UI/API behavior, so store-layer tests alone can close 3 of its 5 requirements to full end-to-end COMPLIANT, unlike the UI-dependent mcp-client/review-ui requirements scored PARTIAL in Work Units 2-3.
4. Using a real temp-file-backed SQLite database instead of :memory: mode is necessary, not just convenient, for the Durable-Override-Writes test's "second independent connection" proof, since :memory: databases cannot be reopened by a separate connection without shared-cache URI tricks.
5. putOverride's field parameter has no runtime or SQL-level validation against the 8 known overridable fields, so an invalid field is silently dropped on load with zero test coverage of that path.

---


```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:7bb8986245d3f24476033bbcbd4e433e993cc5f175b17db53ad905f26c093f14
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 0/0
scenarios: 0/0
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:58ef2f046eddadb4c523acb66f90690a739662f69997c05930200d9c18efded8
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:049a6fbfc499b22ce7c46d96b15e866b108be525d2eb3afe436880a982f36a80
```


# Verification Report: direct-db-integration - Work Unit 5 (Phase 5, API Layer)

**Change**: direct-db-integration
**Scope**: Work Unit 5 ONLY - Phase 5 (API Layer), tasks 5.1-5.7, delivered as TWO chained PRs against one original `sdd-apply` diff (split after the single-branch diff exceeded the 800-line review budget; user chose split over `size:exception`)
**Branches / PRs**:
- PR #6 `feat/api-batches` (base `feat/sqlite-store`) - tasks 5.1-5.2 (`src/api/routes/batches.ts`)
- PR #7 `feat/api-write-config` (base `feat/api-batches`) - tasks 5.3-5.7 (`src/api/routes/write.ts`, `src/api/config.ts`, `src/api/app.ts`)
- Combined tip for verification: `feat/api-write-config` (contains both splits' code)
**Mode**: Strict TDD
**Envelope note**: the strict machine-readable envelope below reports requirements 0/0 and scenarios 0/0, following the Work Unit 2 convention: every review-ui/write-confirmation requirement touched by this unit's task annotations (Batch Load Failure Blocks Rendering; Full Write Preview Rendering; Commit Action Disabled Until Upstream Write Tools Exist; Two-Step Explicit Confirmation) names UI-rendering behavior in its own scenario text ("displays", "rendered", "renders its response"), so none is fully end-to-end COMPLIANT at Phase 5 (API-only) scope, matching the honest scoring convention already used for review-ui/mcp-client in Work Units 2-3 (as opposed to Work Unit 4's persistence requirements, whose text has zero UI wording and could be scored 3/3). The full informational matrix (4 requirements / 5 scenarios in scope, all genuinely PARTIAL with real API-layer evidence) is in the Spec Compliance Matrix section below.
**apply-progress artifact**: not retrievable via Engram this session - no `mem_*` tools were present in this agent's tool inventory, the same recurring gap logged for every prior apply/verify session on this change (see `engram_tooling_gap` entries in `state.yaml`). Verification below is based on independent reproduction only: actual repository files, `git log`/`git show` at commit granularity (including a `git worktree` checkout of a pre-implementation commit to literally re-run a claimed RED failure), `tasks.md` inline notes, `gh pr view 6`/`gh pr view 7`, and live command execution - not on any apply-phase self-report text.

---

## Reproduction Summary (independently re-run in this environment)

| Check | Command | Result |
|---|---|---|
| Working tree / branch | `git status`, `git branch -a` | On `feat/api-write-config`, up to date with `origin/feat/api-write-config`, working tree clean |
| Dependency install | `npm install` | Up to date, 284 packages audited, 0 vulnerabilities |
| API-scoped test suite | `npm test -- src/api` | 4 files, 22/22 passed - matches claim exactly (7 batches + 10 write + 2 config + 3 app) |
| Full test suite | `npm test` | 19 files, 100/100 passed - matches claim exactly |
| Type check | `npm run typecheck` | Clean, no errors |
| Build | `npm run build` | tsc clean + vite build succeeds (`dist/web/index.html`, `dist/web/assets/*`) |
| Split A diff size | `git diff --numstat feat/sqlite-store...feat/api-batches` | 4 files: `batches.ts` (+99), `batches.test.ts` (+173), `state.yaml` (+30/-4), `tasks.md` (+2/-2) = 304 additions / 6 deletions, exact match to PR #6's reported `additions:304, deletions:6, changedFiles:4` |
| Split B diff size | `git diff --numstat feat/api-batches...feat/api-write-config` | 8 files: `app.ts`(+41), `app.test.ts`(+107), `config.ts`(+20), `config.test.ts`(+17), `write.ts`(+192), `write.test.ts`(+231), `state.yaml`(+59/-9), `tasks.md`(+5/-5) = 672 additions / 14 deletions, exact match to PR #7's reported `additions:672, deletions:14, changedFiles:8` |
| PR #6 metadata | `gh pr view 6 --json state,baseRefName,headRefName` | OPEN, `feat/sqlite-store` -> `feat/api-batches` |
| PR #7 metadata | `gh pr view 7 --json state,baseRefName,headRefName` | OPEN, `feat/api-batches` -> `feat/api-write-config` - correctly targets PR #6's own branch (chained-PR structure, not `feat/sqlite-store` directly), as designed |
| RED-state replay (new, see below) | `git worktree add` at commit `c4ee05c`, `npx vitest run src/api` inside it | Confirmed genuine RED: `Cannot find module './batches.js'` |
| Commit message AI-attribution scan | `git log feat/sqlite-store..feat/api-write-config` full body, case-insensitive `claude\|anthropic\|co-authored\|generated with\|ai-generated\|session` | Zero matches |
| PR body AI-attribution scan | `gh pr view 6 --json body`, `gh pr view 7 --json body`, same pattern | Zero matches |
| Commit author identity | `git log --format="%H %s" feat/sqlite-store..feat/api-write-config` + `git show` per commit | All 6 implementation/test commits authored by `Kelvin Miranda <kelvin.miranda@aracaristudios.com>`, no AI co-author trailer |
| Cleanup | `git worktree remove ../facodes-wu5-red --force` | Worktree removed; repo left on `feat/api-write-config`, clean |

---

## Task-by-Task Verification

| Task | Claimed | Verified | Notes |
|---|---|---|---|
| 5.1 `src/api/routes/batches.ts` - GET/PUT wired to `YhatReadPort` + `ReviewStateStore` | [x] with NOTE/DEVIATION | Confirmed | `GET /api/batches/:batchId` calls `deps.readPort.queryEntities({entity:"Codes", filters:[BatchNo=id]})` inside a `try` block BEFORE any call to `deps.store.loadBatch`; on a caught error it returns immediately (502) without ever reaching the `store.loadBatch` line. `PUT /api/batches/:batchId/codes/:codeId/fields/:field` validates the body with `overrideBodySchema` (`z.object({value: z.string(), valueId: z.number().optional()})`) then calls `store.putOverride`, mapping `InvalidOverrideFieldError` to 400. The DEVIATION note (no live-resolver orchestration exists yet, so `GET` serves the store's persisted snapshot rather than a freshly-resolved one) is accurate - confirmed no orchestrator function exists anywhere in `src/api/` or `src/domain/` that builds a fresh `BatchAnalysis` from raw MCP rows; this is honestly disclosed, not glossed over. |
| 5.2 RED+GREEN: blocking error on MCP failure, never partial row set (spec review-ui - Batch Load Failure Blocks Rendering) | [x] with RESOLVED note | Confirmed, genuinely tested at the exact claimed level | `batches.test.ts`'s "never reads or returns cached/persisted row data once the live read has failed" test asserts `expect(store.loadBatch).not.toHaveBeenCalled()` directly - not merely that the response is 502. Read the route source to confirm this is structurally guaranteed, not just true for this test's mock ordering: the `store.loadBatch` call is lexically after the `try/catch` block that returns early on failure, so there is no code path where a failing read reaches the store. |
| 5.3 `src/api/routes/write.ts` - `POST /api/batches/:id/write-plan` | [x] with NOTE | Confirmed | Route loads the batch, returns 404 if absent, calls `isFullyResolved(batch)` and returns `409 batch_not_fully_resolved` if not, otherwise builds a plan (via `WriteToolClient.planWrite` when the flag is true, or `buildLocalWritePlan` when false) and persists it via `store.savePlan` with `status: awaiting_confirmation`. |
| 5.4 RED+GREEN: write-plan calls MCP `yhat_write_codes {mode:"plan"}` only when `WRITE_TOOLS_ENABLED=true`; persists plan as `awaiting_confirmation` (spec write-confirmation - Full Write Preview Rendering) | [x] with NOTE/DEVIATION | Confirmed, both branches genuinely exercised | `write.test.ts` asserts `writeClient.planWrite` is called exactly once when `writeToolsEnabled: true`, and asserts `writeClient.planWrite` is `not.toHaveBeenCalled()` when `writeToolsEnabled: false` while still asserting `store.savePlan` is called with `status: "awaiting_confirmation"` and `savedPlan.statements.length` > 0 - genuinely proving the local-builder path produces real content, not an empty stub. The disclosed DEVIATION (`buildLocalWritePlan` lives in `write.ts`, not `src/domain/`, to stay inside design.md's Phase-5 File Changes scope) is accurate - confirmed `src/domain/` was not modified by either PR's diff (`git diff --numstat` above shows zero `src/domain/*` entries). |
| 5.5 RED+GREEN: `POST /api/batches/:id/write-commit` asserts `planId` match/non-expiry, accepts no statements, returns `501` while flag is false (spec write-confirmation - Commit Action Disabled / Two-Step Explicit Confirmation) | [x] with RESOLVED note | Confirmed, precisely as claimed | The commit body schema is `z.object({planId: z.string()}).strict()` (`.strict()` literally present in `write.ts`, not merely an object schema) - the dedicated test "accepts no statements in the commit body - a body carrying statements is rejected as invalid" sends `{planId, statements:[...]}` and asserts `400` plus `store.recordConfirmation` never called, proving `.strict()` (not `.object()`'s default key-stripping) is what rejects the extra key. `PlanConfirmationError` kind-to-status mapping (`no_plan`->404, `plan_id_mismatch`->409, `plan_expired`->410) is implemented in `planConfirmationErrorStatus` and each of the three kinds has a dedicated passing test. While the flag is false, the route always answers `501 write_tools_unavailable` with the exact Spanish copy from design.md's sequence diagram, confirmed by a direct string comparison against design.md. |
| 5.6 RED+GREEN: reject any single request path that both plans and commits in one call (spec write-confirmation invariant, sequence diagram) | [x] with RESOLVED note | Confirmed, both proof paths are genuine | (1) `write-commit` for a batch with no persisted plan maps the store's `no_plan` error to 404 (test asserts `response.statusCode === 404` and the JSON body's `error` field equals `no_plan`) - there is no code path where `write-commit` silently calls `store.savePlan` or otherwise fabricates a plan first. (2) The dedicated invariant test "write-plan alone never confirms the plan or invokes a commit call" calls only `POST .../write-plan` with `writeToolsEnabled: true` and a `writeClient` whose `commitWrite` is a spy, then asserts BOTH `store.recordConfirmation` and `writeClient.commitWrite` were never called - a genuine negative assertion against the actual write-plan route, not an assumption from the response shape. Read `write.ts`'s `write-plan` handler line-by-line: it never references `recordConfirmation` or `commitWrite` anywhere in its body, confirming the test's assertion is structurally guaranteed, not incidental. |
| 5.7 Wire `WRITE_TOOLS_ENABLED` through Fastify config/plugin registration | [x] with RESOLVED note, RISK/NOTE on `src/index.ts` | Confirmed | `src/api/config.ts`'s `resolveApiConfig` does `env.WRITE_TOOLS_ENABLED === "true"` - a literal `===` string comparison against the exact literal `"true"`, not a truthy/Boolean coercion (`Boolean("false")` would be `true` under coercion; this implementation correctly returns `false` for `"false"`). `config.test.ts` explicitly tests four values: unset (false), `"true"` (true), `"TRUE"` (false - catches case-sensitivity), `"1"` (false - catches non-boolean-string truthy coercion), `"false"` (false). `src/api/app.ts`'s `buildApp` composes `registerBatchesRoutes` + `registerWriteRoutes`, defaulting `config` to `resolveApiConfig()` when not injected. The RISK/NOTE (`src/index.ts` still the Phase-1 placeholder, not wired to `buildApp`/a real `app.listen()`) is confirmed accurate by direct read of `src/index.ts` - it is still the single `console.log` scaffold stub from Work Unit 1, unchanged by this unit. Honestly disclosed as an explicit follow-up, not silently claimed as done. |

---

## RED-State Replay (independently reproduced, not merely trusted from the self-report)

All three implementation tasks in this unit (5.2/5.4-5.6 collectively, 5.7) land as cleanly split test-only-then-implementation commit pairs, continuing the pattern Work Unit 4 first established:

- `c4ee05c` `test(api): add failing tests for batches GET/PUT routes` (173 insertions, `batches.test.ts` only) -> `27e5edd` `feat(api): implement batches GET/PUT routes...` (99 insertions, `batches.ts` only)
- `bf05af9` `test(api): add failing tests for write-plan/write-commit routes` (231 insertions, `write.test.ts` only) -> `7451ae2` `feat(api): implement write-plan/write-commit two-step confirmation gate` (192 insertions, `write.ts` only)
- `c97520c` `test(api): add failing tests for WRITE_TOOLS_ENABLED config wiring` (124 insertions, `app.test.ts` + `config.test.ts` only) -> `6673adc` `feat(api): wire WRITE_TOOLS_ENABLED through Fastify app factory` (61 insertions, `app.ts` + `config.ts` only)

`git show <test-commit>:<implementation-file>` returns `fatal: path exists on disk, but not in <commit>` for all three pairs (`batches.ts` at `c4ee05c`, `write.ts` at `bf05af9`, `config.ts`/`app.ts` at `c97520c`) - each test-only commit genuinely predates its implementation file, cryptographically provable from the object store, not merely plausible.

Went one step further and literally replayed the RED state: `git worktree add ../facodes-wu5-red c4ee05c`, copied `node_modules` over (native `better-sqlite3` build reused, avoiding an unrelated toolchain rebuild), then `npx vitest run src/api` inside that worktree fails with:

```
Error: Cannot find module './batches.js' imported from '.../src/api/routes/batches.test.ts'
```

- the exact expected RED failure (the test file imports `registerBatchesRoutes` from a module that does not exist yet at that commit). Worktree removed after the replay; the main working tree was left untouched and clean on `feat/api-write-config` throughout.

**Verdict**: this is a genuinely bisectable, independently-buildable RED-then-GREEN history for all three task groups in this unit - the second work unit in this change (after Work Unit 4) where TDD evidence was proven by direct reproduction rather than argued from plausibility.

---

## Ports/Errors Drift Check (cross-cutting, per task brief item 4)

Read `src/ports/YhatReadPort.ts`, `src/ports/ReviewStateStore.ts`, `src/store/sqlite/index.ts`, and `src/store/sqlite/errors.ts` directly against `batches.ts`/`write.ts`'s actual usage:

- `YhatReadPort.queryEntities(query: EntityQuery): Promise<Record<string, unknown>[]>` - `batches.ts` calls it with a literal `{entity, filters}` object matching `EntityQuery`'s shape exactly; no drift.
- `ReviewStateStore` - both routes call only methods that exist on the interface (`loadBatch`, `putOverride`, `savePlan`, `recordConfirmation`) with matching argument counts/order; no drift.
- `InvalidOverrideFieldError` (added to `src/store/sqlite/errors.ts` and wired into `SqliteReviewStateStore.putOverride` post-Work-Unit-4-verify, per that report's WARNING 1) - confirmed present in `errors.ts`, confirmed thrown by `putOverride` when `!isOverridableField(field)`, and confirmed correctly mapped by `batches.ts`'s `PUT` handler to `400 invalid_override_field` (not silently swallowed, not left as an unhandled 500). This closes the exact gap Work Unit 4's verify flagged as untested/unmapped at the time - `batches.test.ts` now has a dedicated test asserting this mapping (`"maps InvalidOverrideFieldError from the store to a 400 response"`).
- `PlanConfirmationError`/`PLAN_CONFIRMATION_ERROR_KIND` (from Work Unit 4) - `write.ts`'s `planConfirmationErrorStatus` switch covers all three kinds (`no_plan`/`plan_id_mismatch`/`plan_expired`) exhaustively; TypeScript's `--noEmit` clean run confirms the switch is exhaustive (no `default` case needed, no missing-case error), and each kind maps to the exact HTTP status tasks.md 5.5's NOTE claims (404/409/410 respectively).

No drift found anywhere between the ports/errors from Work Units 3-4 and this unit's consumption of them.

---

## Spec Compliance Matrix

Re-read directly from `specs/review-ui/spec.md` (5 requirements / 6 scenarios) and `specs/write-confirmation/spec.md` (4 requirements / 5 scenarios). This unit's task annotations claim 1 of 5 review-ui requirements (Batch Load Failure Blocks Rendering) and 3 of 4 write-confirmation requirements (Full Write Preview Rendering; Commit Action Disabled Until Upstream Write Tools Exist; Two-Step Explicit Confirmation) - `Approval-Request Signal Rendering` is not cited by any Phase 5 task and correctly not claimed here (100% UI-rendering text, Phase 6 scope).

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Batch Load Failure Blocks Rendering | Failed live read shows a blocking error, not a partial table | `batches.test.ts`: `queryEntities` rejects -> `502 batch_load_failed`, `store.loadBatch` never called | PARTIAL - the API-layer blocking contract (never surface stale/partial data on a live-read failure) is COMPLIANT and meaningfully tested; the scenario's own text also names "displays a visible... error message" and "no partial or cached row data... is rendered in the table", which is UI-rendering behavior belonging to Phase 6 (not yet built) |
| Full Write Preview Rendering | Preview renders when batch is fully resolved | `write.test.ts`: `write-plan` returns 200 with a plan whose `statements` are non-empty and traceable to every resolved field | PARTIAL - the API-layer plan-data generation (equivalent-coverage local preview, or the MCP-backed plan when the flag is true) is genuinely implemented and tested; the scenario's own text ("the preview displays every planned insert/change") is UI-rendering, Phase 6 |
| Commit Action Disabled Until Upstream Write Tools Exist | Commit control shows disabled with reason | `write.test.ts`: `write-commit` returns `501 write_tools_unavailable` with the exact Spanish reason string from design.md's sequence diagram while the flag is false | PARTIAL - the API-layer backend enablement (a machine-readable status + reason the UI needs to render the disabled control) is implemented and tested; the requirement's own scenario text is entirely about UI rendering of a disabled control, which is Phase 6 |
| Commit Action Disabled Until Upstream Write Tools Exist | Disabled state is accessible without color | none in this unit (100% UI/visual-encoding concern) | UNTESTED / correctly out of scope - no API-layer sub-behavior exists for this scenario; Phase 6 |
| Two-Step Explicit Confirmation | Commit requires a separate confirmation step | `write.test.ts`: `write-plan`/`write-commit` remain two structurally separate routes; the dedicated invariant test proves `write-plan` never calls `recordConfirmation`/`commitWrite` | PARTIAL - the API-layer invariant (no single request path plans-and-commits) is genuinely implemented and tested, matching design.md's sequence diagram exactly; the scenario's own text also names "a subsequent, distinct confirmation action" (a UI-level user action) and "renders its response" (UI), which is Phase 6 |

**Compliance summary**: 0 of 5 in-scope scenarios are fully end-to-end COMPLIANT under the strict rule that a scenario is compliant only when a covering test passed at runtime for the complete scenario text, not a sub-behavior of it - matching this report's envelope (`requirements: 0/0`, `scenarios: 0/0`) and consistent with the Work Unit 2/3 convention (as opposed to Work Unit 4's zero-UI-wording persistence requirements, which could be scored 3/3). 4 of 5 in-scope scenarios show genuine, passing API-layer prerequisite evidence (marked PARTIAL above) - a materially stronger showing than a stub, since each PARTIAL result is backed by a real assertion against the actual route behavior, not merely "the response looks plausible." 1 of 5 (Disabled state is accessible without color) has zero API-layer sub-behavior and is correctly not attempted in this unit.

---

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | Partial (same Engram gap as WU1-4) | No separate apply-progress artifact retrievable this session; `tasks.md` inline NOTE/RESOLVED annotations serve as the substitute self-report, cross-checked against source above |
| All tasks have tests | Yes | 5.2/5.4/5.5/5.6 share `batches.test.ts` (7 tests) + `write.test.ts` (10 tests); 5.7 has `config.test.ts` (2 tests) + `app.test.ts` (3 tests); 5.1/5.3 are implementation-only tasks with no dedicated RED+GREEN tag, consistent with tasks.md's own tagging convention |
| RED confirmed (tests exist) | Yes, and independently replayed | All 4 new test files verified present and non-trivial on disk; RED state additionally reproduced live via `git worktree` at commit `c4ee05c` (see RED-State Replay above) |
| GREEN confirmed (tests pass) | Yes | 22/22 API-scoped, 100/100 full suite, independently re-run in this session, exact match to claim |
| Triangulation adequate | Yes | 22 cases across 4 files, each with genuine outcome variance (200/404/502 for GET; 204/400 for PUT; 200/404/409 for write-plan with two distinct 200-path assertions [flag true vs. false]; 501/409/410/400/404 for write-commit; true/false flag propagation x3 for app.ts) |
| Safety Net for modified files | N/A - no pre-existing file was modified by this unit's implementation diff (all 6 new files are Create, per `git diff --numstat` above); `tasks.md`/`state.yaml` are SDD-tracking-only changes | |

**TDD Compliance**: 6/6 checks passed (1 marked N/A for a legitimate reason, not a gap)

---

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit (domain, unchanged) | 37 | 10 | Vitest 3.2.7 |
| Unit (MCP config/validation, unchanged) | 22 | 3 | Vitest 3.2.7 |
| Integration (HTTP stub - MCP layer, unchanged) | 6 | 1 | Vitest 3.2.7 |
| Integration (real file I/O - store layer, unchanged) | 13 | 1 | Vitest 3.2.7 + real `better-sqlite3` |
| Integration (in-process Fastify - API layer, this unit) | 22 | 4 | Vitest 3.2.7 + `fastify.inject` (no real HTTP socket, no real MCP server, no real SQLite - all deps are hand-rolled fakes per design.md's Testing Strategy table) |
| E2E | 0 | 0 | not installed yet (Phase 7) |
| Total | 100 | 19 | |

Classification note: all 22 new tests use `fastify.inject` against a real `Fastify()` instance with the actual route-registration functions, but fake `YhatReadPort`/`ReviewStateStore`/`WriteToolClient` objects (plain `vi.fn()`-backed objects, not `vi.mock()` module mocks) - classified as integration-layer (real HTTP routing/serialization/status-code machinery, fake I/O boundaries), matching design.md's Testing Strategy table exactly ("Integration | ... plan->commit gate rejects a single-call commit and an expired/mismatched planId | Vitest + in-process Fastify").

---

### Changed File Coverage

No coverage tool is installed (unchanged from Work Units 1-4). Manual inspection: every exported route handler in `batches.ts` (`GET`, `PUT`) and `write.ts` (`write-plan`, `write-commit`) has at least one direct test per branch (success, 404, 502/409/501/400/410 as applicable). `buildLocalWritePlan` and `isFullyResolved` (pure helper functions in `write.ts`) are exercised indirectly through the route-level tests (non-empty `statements` assertion; 409 on an unresolved batch) rather than unit-tested directly - reasonable for small, pure, single-call-site helpers, consistent with how `applyOverrides` was treated in Work Unit 4.

---

### Assertion Quality

Scanned all 4 new test files (`batches.test.ts`, `write.test.ts`, `config.test.ts`, `app.test.ts`) line-by-line for the banned patterns: tautologies, orphan empty-only checks, type-only-alone assertions, ghost loops over possibly-empty collections, smoke-test-only patterns, mock-heavy ratios.

**Assertion quality**: all assertions verify real behavior against actual route responses (status code + JSON body shape) or actual mock-call assertions (`toHaveBeenCalledWith`/`not.toHaveBeenCalled`) tied to specific arguments, not just call counts in isolation. No tautologies. No ghost loops. Fakes are plain typed objects implementing the real port interfaces (`YhatReadPort`, `ReviewStateStore`, `WriteToolClient`), not `vi.mock()` module-level mocks, so a signature drift in the real interfaces would fail TypeScript compilation before any test runs - a stronger guarantee against silent test/implementation drift than a loosely-typed mock would give. Every `it` block asserts a specific, varied expected value (exact error codes, exact HTTP statuses, exact call-argument shapes, non-empty array lengths), not a generic truthy check.

---

### Quality Metrics

Linter: not available, no lint script configured, unchanged from Work Units 1-4.
Type Checker: `tsc -p tsconfig.json --noEmit`, independently re-run, clean, zero errors.

---

## Correctness (Static + Runtime Evidence)

| Requirement | Status | Notes |
|---|---|---|
| Live-read-before-store ordering (blocking-error contract) | Implemented, tested | See task 5.2 above; structurally guaranteed by the handler's control flow, not just true for the test's mock timing |
| `write-plan` fully-resolved precondition | Implemented, tested | `isFullyResolved` checks every field's `status === "resolved"` AND every FA entry's `status === "resolved"`; `409 batch_not_fully_resolved` returned otherwise, with `store.savePlan` asserted never called on that path |
| `write-commit` body `.strict()` schema | Implemented, tested | Confirmed `.strict()` (not `.object()`'s default silent-key-stripping) is the actual mechanism rejecting an extra `statements` key |
| Plan-never-implicitly-commits invariant | Implemented, tested | Both proof paths (no-plan-exists 404; write-plan-alone never calls `recordConfirmation`/`commitWrite`) independently confirmed against actual route code, not just response shape |
| `WRITE_TOOLS_ENABLED` exact-string match | Implemented, tested | `=== "true"` literal comparison; test covers `"TRUE"`, `"1"`, `"false"`, and unset, all correctly resolving to `false` |
| Ports/errors consumption, no drift | Implemented, tested | `YhatReadPort`/`ReviewStateStore`/`InvalidOverrideFieldError`/`PlanConfirmationError` all consumed with matching signatures; `InvalidOverrideFieldError` (added post-WU4-verify) is now genuinely mapped to `400`, closing that report's WARNING 1 |

---

## Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| design.md File Changes (`src/api/routes/{batches,write}.ts`) | Yes | Both files present, scoped exactly as described; `write.ts`'s local plan builder living outside `src/domain/` is a disclosed, reasoned deviation (see task 5.4 above), not silent |
| design.md Write-Confirmation Gate sequence diagram | Yes, line-by-line | `write-plan`'s `409` precondition ("Preparar alta enabled only when every field is resolved"), the `awaiting_confirmation` persist step, the `501`-with-exact-Spanish-copy commit response, and the plan/commit invariant all match the sequence diagram verbatim, confirmed by direct re-read of design.md against `write.ts` |
| design.md Interfaces/Contracts (`YhatReadPort`, `ReviewStateStore`) | Yes | Both routes consume the ports with zero drift, confirmed above |
| design.md Testing Strategy (API layer: "Vitest + in-process Fastify") | Yes | All 22 new tests use `fastify.inject`, matching exactly |
| design.md Migration/Rollout (`WRITE_TOOLS_ENABLED=false` default; plan degrades to a locally-rendered preview) | Yes | `resolveApiConfig` defaults to `false`; `buildLocalWritePlan` is exactly this degraded local preview path |

---

## Issues Found

### CRITICAL
None. All 7 tasks (5.1-5.7) are genuinely implemented across both PR splits, no stubs found anywhere. All claimed test (22/22 API-scoped, 100/100 full suite), typecheck, and build results were independently reproduced exactly. Both diff-size claims (304/4 and 672/8) were reproduced to the exact line and file count. Both PRs' base/head refs are correct for the declared chained-PR-within-a-work-unit structure (PR #7 targets PR #6's branch, not `feat/sqlite-store`, exactly as the task brief states is intentional). Zero AI/Claude attribution was found anywhere in commits or either PR body. `.strict()`, the fully-resolved precondition, the plan-never-implicitly-commits invariant, and the exact-string `WRITE_TOOLS_ENABLED` match were all independently re-verified against source and confirmed genuinely (not just plausibly) tested.

### WARNING
1. `isFullyResolved`'s FA-resolution check (`code.fa.every((fa) => fa.status === "resolved")`) returns `true` vacuously for a code whose `fa` array is empty (`[]`), since `Array.prototype.every` on an empty array is always `true`. `fa` is a `z.array(faEntrySchema)` (variable length) per `src/domain/types.ts`, not a fixed single-slot field, so a code that has not yet had any FA candidate resolved into it (an empty array, distinct from an array containing an unresolved entry) would pass the fully-resolved gate and become plannable. No test in `write.test.ts` exercises this specific empty-array case (both `makeResolvedBatch`/`makeUnresolvedBatch` fixtures always populate exactly one `fa` entry). Not necessarily a functional defect - it may be intentional that a code needing zero FA changes is trivially "FA-resolved" - but this exact edge case has zero test coverage and is not called out anywhere in tasks.md's NOTE for task 5.3, so it is not clear whether it was considered. Worth an explicit test (and a decision on intended behavior) before Phase 6 wires the real "Preparar alta" button to this same precondition.
2. True RED-first git-history replay is possible and was reproduced for all three task groups in this unit (5.2, 5.4-5.6, 5.7) - a strength, not a weakness - but the SDD-tracking-file commits (`4b8e325`, `389c7d8`, marking tasks done in `tasks.md`/`state.yaml`) are separate from the RED/GREEN pairs and were not scanned for AI attribution independently of the aggregate `git log` grep above; the aggregate grep did cover them and found nothing, so this is a documentation note, not an unresolved gap.

### SUGGESTION
1. Consider adding an explicit test for `isFullyResolved` with an empty `fa` array (see WARNING 1), and documenting the intended semantics (is a code with zero FA candidates "resolved" by definition, or should it require at least one `resolved` FA entry?) in `write.ts`'s doc comment or `tasks.md`'s 5.3 NOTE.
2. `src/index.ts` remains the Phase-1 scaffold placeholder, correctly and consistently disclosed as an explicit follow-up in task 5.7's RISK/NOTE - consider tracking it as an explicit numbered task (rather than only prose) under Phase 6 or a new "server boot wiring" line, since Phase 6 needs a running server to develop the SPA against per tasks.md's own Suggested Work Units table.
3. Given this unit is the first in this change delivered as two chained PRs from one original `sdd-apply` diff (rather than one PR per work unit), consider recording the split rationale (800-line budget, `size:exception` declined in favor of a split) directly in `state.yaml`'s `work_unit_5_result` block for future readers who only see PR #6/#7 in isolation.

---

## Verdict

**PASS WITH WARNINGS**

Work Unit 5 (Phase 5 API layer, tasks 5.1-5.7, delivered as two chained PRs #6/#7 sharing one original `sdd-apply` diff) is genuinely and completely implemented: `batches.ts` and `write.ts` both consume `YhatReadPort`/`ReviewStateStore`/the Work-Unit-4 error taxonomy with zero drift, all 7 tasks produce real, non-stub route logic, and all claimed test (22/22 API-scoped, 100/100 full suite), typecheck, and build results were independently reproduced exactly. This is the second work unit in this change (after Work Unit 4) with a genuinely bisectable RED-then-GREEN commit history, independently replayed live via `git worktree` for the earliest pair (`c4ee05c` -> `27e5edd`), reproducing the exact expected `Cannot find module './batches.js'` failure. Both diff-size claims (304 lines/4 files for split A; 672 lines/8 files for split B) were reproduced to the exact line and file count, and both PRs' base/head refs correctly implement the intentional chained-PR-within-a-work-unit structure the task brief describes (PR #7 targets PR #6's branch). The five specific claims flagged for extra scrutiny in the task brief - the live-read-before-store ordering, the fully-resolved precondition, the `.strict()` commit-body schema, the plan-never-implicitly-commits invariant, and the exact-string `WRITE_TOOLS_ENABLED` match - were all independently verified against source (not just the test's framing) and confirmed to be genuinely, not superficially, tested. Zero AI/Claude attribution was found anywhere in commits or either PR body. One non-blocking WARNING (an untested vacuous-true edge case in the FA-resolution precondition for codes with an empty `fa` array) keeps this from a clean PASS, but does not indicate a functional defect in the shipped code's intended common-case behavior and does not block proceeding to Work Unit 6.

What could not be verified in this environment: nothing material. Both PRs were reachable via `gh`, both branches were checked out/diffed directly, and the RED-replay technique from Work Unit 4 was successfully repeated here.

---

## Key Learnings

1. `git worktree add` at a pre-implementation commit, with `node_modules` copied over rather than reinstalled, reliably reproduces a literal RED failure even across a two-PR chained delivery - reproduced the exact claimed error (`Cannot find module './batches.js'`) at commit `c4ee05c`.
2. A two-PR chained split of one original `sdd-apply` diff (after exceeding the 800-line review budget) does not fragment TDD evidence - all three RED/GREEN commit pairs remain individually bisectable regardless of which PR they land in.
3. `.strict()` on a Zod object schema, not `.object()`'s default key-stripping, is what genuinely rejects an unexpected `statements` key in the write-commit body - confirmed by reading the schema definition directly, not inferring it from the test's pass/fail alone.
4. `Array.prototype.every` on an empty array is vacuously `true`, so a fully-resolved-batch precondition keyed on `fa.every(...)` silently treats a code with zero FA entries as FA-resolved - a real, currently-untested edge case in `isFullyResolved`.
5. `InvalidOverrideFieldError`, added post-Work-Unit-4-verify specifically to close that report's WARNING 1, is now genuinely consumed and mapped to `400` by this unit's `PUT` route, with a dedicated passing test - closing that prior gap rather than leaving it dangling.

---

# Verification Report: direct-db-integration - Work Unit 6 (Phase 6, Web SPA)

**Verdict: FAIL, then fixed** -- 3 CRITICAL findings, 3 WARNING, 4 SUGGESTION at first pass; all 3 CRITICAL findings fixed and independently re-run green before this record was persisted.

## Scope

Work Unit 6, Phase 6 Web SPA, tasks 6.1-6.12, delivered as 5 chained PRs (#8 `feat/web-tokens`, #9 `feat/web-drawer`, #10 `feat/web-table`, #11 `feat/web-confirm`, #12 `feat/web-spa`).

## What was independently reproduced (all matched claims exactly)

- `npm install` clean, `npm test` -> 144/144 passing (before fix), `npm run typecheck` clean, `npm run build` clean.
- Per-PR diff sizes: 693/667/719/271 changed lines (exact match); combined 5-PR code-only diff 2920 lines (exact match), no scope leakage.
- All 5 PRs OPEN with the correct chained base/head sequence. Zero AI/Claude attribution anywhere.
- `#00E3DB` genuinely scoped to `ConfirmControl` only. Grayscale-safe status encoding, dialog/Escape semantics, real filter/density wiring, three genuinely distinct empty/loading/error states -- all confirmed with real behavioral tests.

## CRITICAL findings (discovered by tracing actual production wiring, not the apply report's prose)

1. **FA resolution (task 6.7) was non-functional end-to-end.** `App.tsx` never passed `onSelectFaAlternative`/`onSelectExistingFa`/`onCreateNewFa`/`onReactivateDiscardedFa` to `FieldDrawer`; they fell back to `?? (() => {})` no-ops. `FaEditor.test.tsx` passed only because it mocks the callbacks; `App.test.tsx` never opened the `fa` field's drawer.
2. **Override marker/restore (task 6.8) was dead code.** `OverrideMarker` was rendered nowhere in production, and `App.tsx` had no `isOverride` state at all. `onMarkForReview` was also never wired.
3. **"Precedent codes" were never rendered** in the drawer, despite both the spec text and `FieldDrawer.tsx`'s own doc comment claiming they were shown (`CodeEntry.references` was never read).

## Warnings (non-blocking)

Missing UI implementation for fa-assignment's False-Company Alert / Generic Unidentified Placeholder (likely a tasks.md coverage gap); non-bisectable per-slice commit history (same pattern as WU2/WU3); an unused `--shadow-focus` CSS token.

## Spec compliance (before fix)

9/16 in-scope scenarios (7/13 requirements) fully end-to-end compliant. 4 scenarios failed end-to-end despite passing isolated component tests. 2 scenarios (Two-Step Confirmation, Approval-Request Signal) honestly disclosed as blocked on the external `yhat-mcp-server` write-tools dependency, not treated as defects.

## Post-verify fix

All 3 CRITICAL findings were fixed directly by the orchestrator, strict TDD (RED-then-GREEN), on branch `feat/web-spa`:

1. **FA resolution**: wired all 4 FA callbacks in `App.tsx` to real client-side state updates on `code.fa`. No backend persistence path exists for FA resolution -- `ReviewStateStore.putOverride` only covers the 8 scalar `fields`, not `fa` (confirmed via `src/store/sqlite/index.ts`'s `OVERRIDABLE_FIELDS`) -- so this is honestly scoped as client-side/session-only, the same pattern already declared for the override marker. Reactivating a discarded candidate moves it into `alternatives` without auto-resolving, matching the exact spec wording ("becomes an assignable alternative"); the open drawer refreshes live via a new `buildFaDrawerDetail` helper.
2. **Override marker/restore**: wired `overriddenFields`/`originalFieldValues` state in `App.tsx` (preserving the pre-override value for restore); replaced `FieldDrawer`'s inline restore button with the actual `OverrideMarker` component so it is no longer orphaned; wired `onMarkForReview` to set a field's status to `needs_confirm`.
3. **Precedent codes**: added a `references` field to `NonFaFieldDetail` and rendered a "Codigos precedentes" section (title/description/columns/rows table, footnote) in `FieldDrawer.tsx`, sourced from `CodeEntry.references`.

7 new App-level integration tests were added, each exercising the fix end-to-end (real button clicks, real state assertions) -- exactly the kind of test the verify pass found missing. Full suite: 144/144 -> 151/151 after the fix. `npm run typecheck` clean, `npm run build` clean. AI-attribution scan clean on all fix commits.

## Incident note

A background fix agent (launched to address these same 3 findings) hit a session rate limit and failed before writing any code. Separately -- and apparently caused by that same failed agent process -- the orchestrator's own in-progress edits to `FieldDrawer.tsx` and `App.test.tsx`, plus this verify session's own uncommitted `state.yaml`/`verify-report.md` updates, were silently reverted on disk mid-session. Detected via a stale-file warning, confirmed via `git status` and content greps, and reconstructed from content already held in conversation context. No data was permanently lost. Lesson: do not run a background agent concurrently with direct manual edits to the same working tree.

---
