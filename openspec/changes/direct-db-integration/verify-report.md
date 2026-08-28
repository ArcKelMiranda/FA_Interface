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
