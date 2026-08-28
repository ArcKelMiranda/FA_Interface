# Proposal: Direct DB Integration via yhat-mcp-server (facodes UI service)

## Intent

FA Code registration today runs through a Claude.ai React artifact (v5) with no backend: a Claude skill (`gestion-fa-codes-sql`) analyzes batches against a stale CSV snapshot of YHat, the user pastes a JSON blob into the artifact, and the flow ends in a T-SQL script with commented `COMMIT`/`ROLLBACK` reviewed by hand in SSMS. That means stale reads, manual copy-paste handoffs, and no live verification against production. Replace it with a Dockerized facodes UI service that reads YHat **live** as an MCP client of the already-deployed `yhat-mcp-server`.

## Scope

### In Scope
- New Dockerized facodes UI service (successor to the v5 review UI: table, drawer, 8-field resolution, FA assignment, texture+color status, 9-tick fingerprint).
- MCP client integration against `yhat-mcp-server` (`yhat_query_entities`; `yhat_query` for admin raw SELECT).
- Live reads replacing the CSV-snapshot + pasted-JSON ingestion path.
- Full write preview/confirm UX, built complete but with the committing action **disabled** until write tools exist upstream.
- Internal-identity credential handling for the `yhat-mcp-server` HTTP endpoint.
- **Server-side persistence of batch/review state** (revised after proposal review, 2026-08-28): in-progress overrides and batch state must survive a service restart and be resumable from another machine — `localStorage` alone is insufficient. This introduces a new datastore to the service (technology choice — embedded SQLite vs. a small Postgres instance vs. other — deferred to `sdd-design`).

### Out of Scope
- Write tools in `yhat-mcp-server` (writer whitelist, confirmation, audit log) — cross-project change, tracked as `sdd/yhat-mcp-server/pending-write-tools`.
- Any direct SQL Server connection, driver, or credential in facodes.
- Multi-user, auth/roles beyond single-user use. (Server-side persistence is now in scope — see above — but remains single-user; no shared/concurrent-editing model.)
- Adding a UI to `yhat-mcp-server` (explicitly refused in that project).
- Fallback SQL-script generation as a write workaround (explicitly rejected).

## Capabilities

### New Capabilities
- `fa-code-review-ui`: batch table, per-field drawer, 8-field resolution, status encoding, fingerprint, filters.
- `fa-assignment`: FA identification (existing/new), alternatives, discarded-candidate reactivation.
- `yhat-mcp-client`: live MCP reads, connection/auth, error and empty states.
- `write-confirmation-gate`: approval-request rendering, explicit two-step confirm, disabled write state.
- `review-state-persistence`: server-side datastore for in-progress batch/review overrides, surviving restarts and resumable cross-machine (technology TBD in `sdd-design`).

### Modified Capabilities
- None (no existing `openspec/specs/`).

## Approach

facodes = MCP client + UI only. Reads go live through `yhat_query_entities`. The write path is designed and rendered end-to-end but gated: the UI must surface `yhat-mcp-server`'s approval-request signal and require a distinct user action before any committing call, never auto-confirm. This replaces the commented-`COMMIT` gate (a response to a real incident: an orphaned `BEGIN TRAN` locked the production `Codes` table).

### Business rules carried forward from PRD v5
8-field model (Office, Country, Region, IBD, NSCC, Dealer, Agente, Origin); FA existing/new with alternatives and discarded candidates; Pershing/UBS format rules; "same Branch+Rep = same FA"; generic `-Unidentified` placeholders; false-company detection; accessibility-safe status (texture + color, never color alone); per-field confirm/correct/override with evidence + confidence.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `FACodes/` (repo root) | New | Entire UI service, from scratch |
| `PRD_revision_facodes.md` | Superseded | Business rules survive; architecture does not |
| `yhat-mcp-server` | External | Write tools required before write path ships |
| New datastore (facodes service) | New | Server-side persistence for review state; technology TBD |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Business-logic drift: resolution/matching rules exist only as skill prompts, not code | High | Resolve the open question below in `sdd-design`; treat PRD v5 as the closest spec |
| Safety property regressed by a live-connected app | Med | Confirm gate is a hard requirement in `write-confirmation-gate` spec; no single call may plan and commit |
| Write path blocked on external dependency | High | Ship UI complete with write disabled; no workaround path |
| Zero test infra today | High | Stack choice must include a test runner; revisit `config.yaml` `tdd: false` |
| v5 artifact source is not in this repo | Med | Archive it before cutover (see Rollback) |
| New datastore adds a stateful component with no backup/migration story yet | Med | Define backup/restore and schema-migration approach in `sdd-design`; a single-user embedded DB (e.g. SQLite) keeps this small |

## Open Design Questions (must be decided in `sdd-design`)

1. Reads move from "Claude analyzes a CSV snapshot" to "facodes queries YHat live". **Where does field-resolution / FA-matching / duplicate-detection logic now live?** Candidates: (a) facodes backend reimplements it over live MCP data; (b) facodes still calls Claude for analysis, feeding live-queried data instead of a snapshot; (c) hybrid split. Not decided here.
2. **Datastore technology for `review-state-persistence`**: embedded (SQLite) vs. a standalone service (Postgres) vs. other — affects Docker Compose shape (one more container or not), backup story, and how "resumable from another machine" is actually delivered (a networked DB vs. a file that needs syncing). Not decided here.

## Rollback Plan

This is a full replacement — v5 does not run in parallel. Reversibility depends on the old path staying intact:
1. **Before cutover**, archive the v5 artifact source into this repo (verified: the repo currently holds only `PRD_revision_facodes.md` and `.atl/`; the artifact source lives only in Claude.ai history and is not recoverable from here).
2. The stopgap flow (skill + CSV snapshot + paste JSON + SSMS) has no facodes-side dependency, so it remains usable as long as `gestion-fa-codes-sql` and the artifact source are preserved.
3. Runtime rollback: stop the facodes container. `yhat-mcp-server` is unaffected (facodes only consumes read tools).

## Dependencies

- `yhat-mcp-server` deployed and reachable (reads: available today).
- `yhat-mcp-server` write tools (`sdd/yhat-mcp-server/pending-write-tools`) — blocks the write path only.
- Internal-identity header + Host allowlist behind the VPN-restricted Caddy TLS proxy.

## Success Criteria

- [ ] Review UI renders a live batch read from YHat via MCP, with no pasted JSON.
- [ ] All eight fields plus FA assignment are reviewable/overridable with evidence.
- [ ] Status encoding remains readable without color.
- [ ] Write preview renders fully; the committing action is visibly disabled with a stated reason.
- [ ] facodes holds zero SQL Server credentials.
- [ ] Service builds and runs in Docker against `yhat-mcp-server`.
- [ ] In-progress batch/review state survives a service restart and is resumable from another machine (server-side, not `localStorage`-only).
