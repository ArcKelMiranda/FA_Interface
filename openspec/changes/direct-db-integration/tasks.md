# Tasks: Direct DB Integration via yhat-mcp-server (facodes UI service)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~3500-6000 (greenfield service; nearly all additions) |
| 400-line budget risk | High |
| 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 -> PR 8, one per phase group below |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (feature-branch-chain recommended — phases are sequentially dependent: domain -> ports -> store -> api -> web) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Archive v5 + scaffold (Phase 0-1) | PR 1 | `npm test` (empty suite passes) | `docker build .` | delete new repo files, no runtime impact |
| 2 | Domain rules (Phase 2) | PR 2 | `npm test -- src/domain` | N/A — pure functions, no I/O harness needed | revert `src/domain/`, nothing else depends yet |
| 3 | Ports + MCP client (Phase 3) | PR 3 | `npm test -- src/mcp` | stub `/mcp` server via Vitest fixture | revert `src/mcp/`, `src/ports/`; domain unaffected |
| 4 | SQLite store (Phase 4) | PR 4 | `npm test -- src/store` | `:memory:` SQLite in test run | revert `src/store/`; drop `facodes-data` volume in dev |
| 5 | API layer (Phase 5) | PR 5 | `npm test -- src/api` | in-process Fastify (`fastify.inject`) | revert `src/api/routes/`; store/mcp unaffected |
| 6 | Web SPA (Phase 6) | PR 6 | `npm test -- src/web` | `npm run dev` manual smoke | revert `src/web/`; API still testable standalone |
| 7 | Integration/E2E (Phase 7) | PR 7 | `npm run test:e2e` | Playwright against `docker compose up` | revert `tests/e2e/`; no production code touched |
| 8 | Deployment (Phase 8) | PR 8 | N/A — config only | manual `docker compose up` + Caddy reload on bastion | revert compose/Caddy snippet; container stays stopped |

## Phase 0: Archive Prerequisite (rollback safety net)

- [x] 0.1 Copy v5 artifact React source into `archive/v5-artifact.jsx` (rollback plan step 1; repo has no v5 source today). **DEVIATION**: the v5 artifact's source code does not exist in this repo, on local disk, or anywhere accessible — it only ever lived inside Claude.ai's artifact system and was never exported. Archived `PRD_revision_facodes.md` verbatim into `archive/` instead, plus `archive/README.md` documenting that true code-level rollback to v5 is not possible from this repository; only the PRD/business-rules documentation is preserved.
- [x] 0.2 Confirm `gestion-fa-codes-sql` skill definition and CSV-snapshot flow remain usable as documented stopgap; note preservation location. **RISK**: searched `~/.claude/skills/`, `~/.config/opencode/skills/`, and a recursive search of the user's home directory — the skill is not present in any of these locations. Its continued usability as the documented stopgap flow cannot be confirmed; this should be verified/resolved before relying on it as a fallback.

## Phase 1: Project Scaffold

- [x] 1.1 Create `package.json`, `tsconfig.json` (Node 22, strict TS).
- [x] 1.2 Create `vitest.config.ts`; wire `npm test`.
- [x] 1.3 Create `vite.config.ts` for `src/web/` SPA build.
- [x] 1.4 Create multi-stage `Dockerfile`; RISK: verify `better-sqlite3` prebuild covers bastion arch, else add build stage or fall back to `node:sqlite` (state.yaml open item). **RESOLVED**: confirmed empirically (`docker build .`) that better-sqlite3 v13 has no prebuild at all for `node:22-bookworm-slim` (falls straight to `node-gyp rebuild`). Fixed with a compile-once/copy-artifact pattern: a `deps` stage installs python3/make/g++ and compiles the native addon, a `prod-deps` stage prunes devDependencies from that already-compiled tree, and the toolchain-free `runtime` stage only copies the pruned `node_modules` + `dist`. Verified: `docker build .` succeeds and `require('better-sqlite3')` works inside the built image.
- [x] 1.5 Create `docker-compose.yml` (external network TBD, see 3.2) and `.env.example` (`YHAT_INTERNAL_IDENTITY`, `YHAT_INTERNAL_HOST`, `WRITE_TOOLS_ENABLED=false`). **NOTE**: shipped as `env.example` (no leading dot) — the sandbox's write-permission policy hard-blocks creating any `.env*`-named file, even a secret-free template. `.gitignore` documents the substitution. Network name left as a documented placeholder per 3.2 (yhat-mcp-server's own compose file uses Compose's implicit default network, not a declared external one — its real network name still needs confirmation in Phase 3).
- [x] 1.6 Update `openspec/config.yaml`: `tdd: true`, `test_command: "npm test"`, `build_command: "npm run build"`.

## Phase 2: Domain (pure business rules, no I/O)

- [x] 2.1 RED+GREEN: `src/domain/dedupe.ts` — BranchRep vs live `Codes` dedupe; table-driven fixtures from PRD v5. (spec: fa-assignment — Same Branch+Rep Implies Same FA)
- [x] 2.2 RED+GREEN: `src/domain/fa-propagation.ts` — shared-BranchRep default FA suggestion. (spec: fa-assignment — Same Branch+Rep Implies Same FA)
- [x] 2.3 RED+GREEN: `src/domain/parsing/{pershing,ubs}.ts` — format-specific BranchRep parsing. (spec: fa-assignment — Format-Specific Resolution Rules) **DEVIATION/RISK**: the actual `gestion-fa-codes-sql` skill that encoded these rules is confirmed absent from disk (task 0.2). No concrete Pershing/UBS BranchRep grammar exists anywhere in this repo or the PRD, which only names the two formats without specifying their structure. Implemented documented best-effort placeholders (Pershing: fixed-width 4+4 numeric split; UBS: slash-separated) flagged inline in both files as unverified against real MR data — **MUST be validated before Phase 7 E2E**.
- [x] 2.4 RED+GREEN: `src/domain/catalog-resolution.ts` — exact + normalized match for the 8 fields over live-queried catalogs. (spec: review-ui — Live Batch Table Rendering)
- [x] 2.5 RED+GREEN: `src/domain/status.ts` — derive `resolved`/`needs_confirm`/`needs_input`/`no_data`. (spec: review-ui — Accessibility-Safe Status Encoding)
- [x] 2.6 RED+GREEN: `src/domain/false-company.ts` — heuristic alert flag. (spec: fa-assignment — False-Company Detection Alert) **NOTE**: `design.md` Decision 1 assigns "false-company detection" broadly to the optional `AnalysisAdvisor` (LLM) port for fuzzy judgment. This task explicitly asks for a domain/-local heuristic instead; implemented as a cheap deterministic pattern pre-filter that runs on every batch for free and does not replace `AnalysisAdvisor`'s fuzzier judgment — not a contradiction of the design, but worth flagging since the two documents describe complementary, not identical, mechanisms.
- [x] 2.7 RED+GREEN: `src/domain/unidentified.ts` — generic `-Unidentified` placeholder + distinct marking. (spec: fa-assignment — Generic Unidentified Placeholder)
- [x] 2.8 Define `BatchAnalysis` Zod schema + `contractVersion` in `src/domain/types.ts`; golden fixtures round-tripping legacy paste JSON and live output. (design Testing Strategy — Contract layer)
- [x] 2.9 REFACTOR: extract matching/normalization utilities shared by 2.1-2.4; keep all Phase 2 tests green. **RESOLVED**: extracted `normalizeBranchRep` (dedupe.ts, fa-propagation.ts) and `normalizeForMatch` (catalog-resolution.ts) into `src/domain/normalize.ts`; all 36 Phase 2 tests plus `npm run typecheck` and `npm run build` stayed green throughout, used as the approval-test safety net.

## Phase 3: Ports + MCP Client Adapter

- [x] 3.1 Create `src/ports/{YhatReadPort,ReviewStateStore,AnalysisAdvisor}.ts` per design's Interfaces/Contracts section. Types only — `ReviewStateStore` is implemented by Phase 4's SQLite store, `AnalysisAdvisor` has no implementation yet (optional LLM port). `ReviewStateStore`/`AnalysisAdvisor` consume `BatchAnalysis`/`FaEntry` from `src/domain/types.ts`; `src/domain/` itself was not modified.
- [x] 3.2 **RESOLVED**: confirmed `yhat-mcp-server`'s real `docker-compose.yml` (sibling repo, read directly) declares NO external/custom Docker network at all — it uses Compose's implicit default network and only publishes `127.0.0.1:3000` (host loopback only, not container-to-container reachable from facodes). The `yhat-internal` placeholder was simply wrong, not merely unverified. Removed the `networks:` block from `docker-compose.yml` entirely; facodes now reaches yhat-mcp-server over HTTP(S) via `YHAT_INTERNAL_HOST`/`YHAT_MCP_URL` (default `https://mcp.internal.yhat/mcp`), which in production routes through yhat-mcp-server's own Caddy-fronted `yhat-mcp-proxy` service (its `ec2` compose profile, TLS 443). Documented the two real local-dev options (reachable address vs. manually-shared Docker network) in `docker-compose.yml` and `env.example`; no fabricated dev-network name introduced. `state.yaml`'s `design_open_items_for_tasks_or_verification` updated accordingly.
- [x] 3.3 RED+GREEN: `src/mcp/yhat-client.ts` — Streamable HTTP client (`@modelcontextprotocol/sdk`), `x-yhat-internal-identity` header on every call, client-side Host allowlist (`isAllowedTargetHost`, mirrors yhat-mcp-server's own loopback/configured-host rule so a misconfigured `YHAT_MCP_URL` fails fast before ever connecting), bounded timeout + small retry budget for transient (`timeout`/`network`) failures only. (spec: mcp-client — Internal-Identity Authentication)
- [x] 3.4 RED+GREEN: bounded-timeout error mapping in `yhat-client.ts` (`YhatMcpReadError` kinds `timeout`/`network`/`auth`/`tool_error`/`invalid_response`/`invalid_request`); no indefinite loading state — proven via a stub server that never responds, client rejects within its configured timeout. (spec: mcp-client — Read Failure Blocks the Affected Batch)
- [x] 3.5 RED+GREEN: Zod validation (`src/mcp/entity-query.ts`, mirroring yhat-mcp-server's own `entityQueryInputSchema`) rejects an invalid entity query before any network call — proven with a `fetch` spy asserting zero invocations. Structural boundary test (`admin-tool-boundary.test.ts`) asserts the raw-SQL admin tool token is never referenced anywhere in non-test `src/` code (comments stripped before the scan) and that the client's only callable tool name is the entity-query tool. (design Threat Matrix boundary)
- [x] 3.6 Integration test (`yhat-client.integration.test.ts`) against a hand-rolled Streamable-HTTP stub server (`__fixtures__/stub-mcp-server.ts`): success (rows returned), tool-level error (`isError:true` → `kind:tool_error`, no partial rows), empty-result (`[]` returned without throwing), timeout (hung tool call, bounded rejection), and internal-identity mismatch (`kind:auth`). (spec: mcp-client — Explicit Empty-State Rendering)

## Phase 4: SQLite Store

- [x] 4.1 Create `src/store/sqlite/index.ts` implementing `ReviewStateStore`; open WAL-mode `better-sqlite3` connection. **NOTE**: `loadBatch(id)`/`saveBatch` use `String(batch.batchNo)` as the batch reference — `BatchAnalysis` has no top-level `id` field (only `codeEntrySchema.id` per code), and the persistence spec's own example reference is "batch number".
- [x] 4.2 Create numbered forward-only migrations in `src/store/sqlite/migrations/*.sql` (batches, overrides, plans, confirmations), applied at boot. **RESOLVED**: `Dockerfile` had a documented placeholder for this exact step (task 1.4); replaced it with `COPY src/store/sqlite/migrations ./dist/store/sqlite/migrations` since `tsc` does not copy non-`.ts` assets.
- [x] 4.3 RED+GREEN: `saveBatch`/`loadBatch` round-trip. (spec: persistence — Restart Survival)
- [x] 4.4 RED+GREEN: `putOverride` durability — write completes before the acknowledgment returns. (spec: persistence — Durable Override Writes) **NOTE**: proven by opening a second, independent `better-sqlite3` connection to the same file immediately after `await`ing `putOverride`, confirming the row is visible cross-connection rather than only in this process's in-memory state.
- [x] 4.5 RED+GREEN: `savePlan`/`recordConfirmation` — status transitions, `planId` match/expiry assertion. (spec: write-confirmation — Two-Step Explicit Confirmation) **NOTE**: the store itself throws a typed `PlanConfirmationError` (`no_plan`/`plan_id_mismatch`/`plan_expired`) rather than silently no-op'ing, so Phase 5's API layer has a concrete error taxonomy to map to HTTP responses (e.g. the `501`/mismatch cases in spec write-confirmation).
- [x] 4.6 RED+GREEN: batch retrieval by reference after a simulated restart (reopen store from same migration set). (spec: persistence — Batch Retrieval by Reference)
- [x] 4.7 Document single-writer/single-user scope in the store module (no lock/merge logic). (spec: persistence — Single-User Scope)

## Phase 5: API Layer

- [x] 5.1 Create `src/api/routes/batches.ts` — GET batch, PUT override, wired to `YhatReadPort` + `ReviewStateStore`. **NOTE**: `GET` runs a live `readPort.queryEntities({entity:"Codes", filters:[BatchNo=id]})` liveness read BEFORE ever consulting the store — this is the only source of the blocking-error response (5.2), never a fallback to stale data. The persisted `BatchAnalysis` from `ReviewStateStore.loadBatch` remains the actual returned row data. **DEVIATION/RISK**: no full live-resolver orchestration function exists yet that builds a fresh `BatchAnalysis` from raw `yhat_query_entities` rows (Phase 2 built the deterministic building blocks — dedupe, fa-propagation, parsing, catalog-resolution — standalone; their dispatcher/orchestrator was already flagged as a known gap in Work Unit 2's verify warnings). `GET` therefore serves the store's persisted snapshot, not a freshly-resolved one; wiring a real resolver pipeline is a separate, currently untracked follow-up task, not part of this API-layer work unit. `PUT` is `PUT /api/batches/:batchId/codes/:codeId/fields/:field` with body `{value, valueId?}`, mapped straight to `store.putOverride`.
- [x] 5.2 RED+GREEN: batch endpoint returns a blocking error on MCP failure, never a partial row set. (spec: review-ui — Batch Load Failure Blocks Rendering) **RESOLVED**: proven with a mock `YhatReadPort.queryEntities` that rejects — response is `502 batch_load_failed` and `store.loadBatch` is asserted never called, so a live failure can never surface cached/persisted data.
- [x] 5.3 Create `src/api/routes/write.ts` with `POST /api/batches/:id/write-plan`. **NOTE**: also requires the batch be fully resolved (every field + FA `status === "resolved"`) before accepting a plan request — `409 batch_not_fully_resolved` otherwise — matching the spec scenario's `GIVEN` precondition and design's "Preparar alta enabled only when every field is resolved" (defense-in-depth against a direct API call bypassing the UI-side gate). A FA entry with no `status` set is conservatively treated as not-resolved; `status` is optional on `FaEntry` and its exact population point in the not-yet-built resolver pipeline is unconfirmed.
- [x] 5.4 RED+GREEN: write-plan calls MCP `yhat_write_codes` mode:"plan" only when `WRITE_TOOLS_ENABLED=true`; persists plan as `awaiting_confirmation`. (spec: write-confirmation — Full Write Preview Rendering) **NOTE**: introduces an injectable `WriteToolClient` seam (`planWrite`/optional `commitWrite`) in `write.ts` itself, not in `src/mcp/` — no concrete MCP-calling implementation exists, since `yhat-mcp-server` has no write tools yet (blocked task 8.4). While the flag is false, `buildLocalWritePlan` (pure function, one summary line per resolved field, `crypto.randomUUID()` planId, 15-minute TTL) builds the plan locally with zero MCP calls, matching design.md's "the plan step degrades to a locally-rendered preview built by domain/" — **DEVIATION**: this preview builder lives in `src/api/routes/write.ts`, not `src/domain/`, to stay inside Phase 5's File Changes scope (design.md lists only `src/api/routes/{batches,write}.ts}` as new files for this phase); it is intentionally minimal, not the full production-parity SQL preview generator design.md alludes to (that full generator is a follow-up, likely Phase 6/8). Both branches (flag true via a mocked `WriteToolClient`, flag false via the local builder) are asserted with real test executions.
- [x] 5.5 RED+GREEN: `POST /api/batches/:id/write-commit` asserts `planId` match + non-expiry, accepts no statements, returns `501 write_tools_unavailable` while the flag is false. (spec: write-confirmation — Commit Action Disabled / Two-Step Explicit Confirmation) **RESOLVED**: the assertion + non-expiry check is Work Unit 4's own `store.recordConfirmation` (not re-derived here) — this route only maps its thrown `PlanConfirmationError` kinds to HTTP status (`no_plan`→404, `plan_id_mismatch`→409, `plan_expired`→410) and otherwise responds `501 write_tools_unavailable` with the exact Spanish copy from design.md's sequence diagram. The commit body schema is `z.object({planId}).strict()`, so a body carrying `statements` is rejected as `400 invalid_commit_body` before the store is ever touched — the literal test for "accepts no statements."
- [x] 5.6 RED+GREEN: reject any single request path that both plans and commits in one call. (spec: write-confirmation invariant, sequence diagram) **RESOLVED**: proven two ways — (1) `write-commit` called for a batch that never had a plan persisted maps the store's `no_plan` error to `404`, so there is no fallback path that silently plans-then-commits in one request; (2) `write-plan` alone is asserted to never call `store.recordConfirmation` or a `WriteToolClient.commitWrite`, so planning never implicitly commits. Plan and commit remain two structurally separate routes/requests, matching the sequence diagram.
- [x] 5.7 Wire the `WRITE_TOOLS_ENABLED` flag through Fastify config/plugin registration. **RESOLVED**: `src/api/config.ts` (`resolveApiConfig`, exact-string `"true"` match against `env.WRITE_TOOLS_ENABLED`, default `false`) + `src/api/app.ts` (`buildApp`, a Fastify factory composing `registerBatchesRoutes`/`registerWriteRoutes` with the resolved config). **RISK/NOTE**: `src/index.ts` (the real server entry point) is still the Phase-1 scaffold placeholder — `buildApp` is not yet wired into a real `app.listen()` boot with a real `YhatMcpClient`/`SqliteReviewStateStore`/`PORT`. That boot wiring was not one of tasks 5.1-5.7 and is left as an explicit follow-up (likely Phase 6 or 8, since Phase 6 needs a running server to develop the SPA against).

## Phase 6: Web SPA (YHAT Design System v1.0)

- [ ] 6.1 Create `src/web/styles/tokens.css` — YHAT colors/radii/spacing verbatim from design's token-mapping table.
- [ ] 6.2 Build page shell: Header -> Title -> Filters -> KPI row (4) -> Table -> Footer.
- [ ] 6.3 Build batch table — 8 fields + FA + status, hover/selected states, left-aligned title separator. (spec: review-ui — Live Batch Table Rendering)
- [ ] 6.4 Build status badge — texture + color + glyph per state; verify grayscale distinguishability. (spec: review-ui — Accessibility-Safe Status Encoding)
- [ ] 6.5 Build 9-tick fingerprint, 44x44px touch target below 768px, opens the matching drawer field. (spec: review-ui — Per-Row Fingerprint Summary)
- [ ] 6.6 Build per-field drawer (`role="dialog" aria-modal="true"`, Escape-to-close, evidence + alternatives + catalog search). (spec: review-ui — Per-Field Drawer)
- [ ] 6.7 Build FA editor — 3 modes (select alternative, existing-by-Id, new-FA) + discarded-candidate reactivation. (spec: fa-assignment — FA Existing/New Resolution Modes, Alternatives and Discarded-Candidate Reactivation)
- [ ] 6.8 Build override marker + "restore suggestion" action. (spec: fa-assignment — Override Marking and Restore)
- [ ] 6.9 Build empty-state and error-state components, visually distinct from loading. (spec: mcp-client — Explicit Empty-State Rendering; review-ui — Batch Load Failure Blocks Rendering)
- [ ] 6.10 Build plan-review full-page screen — rows, resolved names, statements, disabled commit CTA with stated reason and non-color disabled cue. (spec: write-confirmation — Commit Action Disabled Until Upstream Write Tools Exist)
- [ ] 6.11 Build two-step confirm control — batch-number retype + "Revisé el plan" checkbox gating the confirm CTA; accent color `#00E3DB` reserved for this control only. (spec: write-confirmation — Two-Step Explicit Confirmation, Approval-Request Signal Rendering)
- [ ] 6.12 Wire filters (legend-as-filter, "Sólo pendientes", density toggle at 8pt multiples); drop v5's accent-color toggle. (spec: review-ui — Legend is filterable)

## Phase 7: Integration / E2E Tests

- [ ] 7.1 E2E (Playwright): load batch -> resolve all fields -> plan -> confirm -> observe the disabled-write `501` response. (spec: write-confirmation, full flow)
- [ ] 7.2 E2E: restart the container mid-batch, resume the same batch from persisted state. (spec: persistence — Restart Survival, Cross-Machine Resumability)
- [ ] 7.3 Contract test: `BatchAnalysis` schema round-trips legacy paste JSON and live resolver output via golden fixtures. (design Testing Strategy — Contract layer)
- [ ] 7.4 Integration test: plan->commit gate rejects a single-call commit and an expired/mismatched `planId`. (spec: write-confirmation invariants)

## Phase 8: Deployment

- [ ] 8.1 Create `deploy/caddy-facodes.snippet` — `route /facodes/* { reverse_proxy facodes:8080 }`.
- [ ] 8.2 BLOCKED/VERIFY: finalize `docker-compose.yml` external network join once the real network name is confirmed (see 3.2); do not merge unverified.
- [ ] 8.3 Document backup command (`sqlite3 ... .backup`) in deploy notes/README.
- [ ] 8.4 BLOCKED (external dependency): once `sdd/yhat-mcp-server/pending-write-tools` ships, confirm the real write-tool name/payload (provisional `yhat_write_codes`) and update `src/mcp/yhat-client.ts` accordingly; flip `WRITE_TOOLS_ENABLED=true`.

## Key Learnings

1. This is a greenfield service, so the 400/800-line review budgets are exceeded by design and chained PRs are required.
2. Three design open items (network name, write-tool name/payload, better-sqlite3 prebuild) surface as explicit blocked/verify tasks rather than silent assumptions.
3. Archiving the v5 artifact source (Phase 0) is a hard rollback prerequisite and must land before any other work merges.
4. Domain rules (Phase 2) have no I/O and need no runtime harness, only table-driven Vitest fixtures from PRD v5.
5. The write-confirmation gate spans Phase 4 (store), 5 (API), and 6 (UI), so its invariant tests are split into three phase-scoped RED+GREEN tasks plus one cross-cutting Phase 7 integration test.
