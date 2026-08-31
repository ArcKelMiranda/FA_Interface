# Exploration: direct-db-integration — DB-connected architecture pivot for the FA Codes review tool

**Change**: direct-db-integration
**Project**: facodes
**Phase**: sdd-explore
**Date**: 2026-08-28

## Current State

This is a true greenfield pivot — there is no existing DB-connection code to read. The repo (`C:\Users\KelvinMiranda\Desktop\Yhat\FACodes`) contains only `PRD_revision_facodes.md` (PRD v5) and the `.atl/` notes from `sdd-init`. No `.codegraph/`, no git repo, no package manifests of any kind.

Today's actual flow (v5, being replaced): a Claude Code skill (`gestion-fa-codes-sql`) analyzes FA code batches against a local CSV snapshot of YHat inside a Claude.ai chat, returns a JSON contract (§6 of the PRD), which is pasted into a single-file React artifact with no backend. The artifact renders a review UI (table + drawer, 8 fields + FA assignment), persists overrides in `localStorage`, and generates a T-SQL script with `BEGIN TRAN` and **commented-out** `COMMIT`/`ROLLBACK` — an explicit, incident-driven safety decision (§7–§8: an orphaned `BEGIN TRAN` once locked the `Codes` table in production).

Confirmed by the user: this "sin backend" / copy-paste JSON flow is being replaced by an app that connects **directly** to SQL Server YHat, with the interface itself driving the DB interaction. No language, framework, ORM, or driver has been chosen.

## Affected Areas

- `PRD_revision_facodes.md` — source of truth for business rules (8-field resolution, FA matching, Pershing/UBS formats, dedupe) and the safety decision (§7–§8) any new architecture must not silently regress.
- `.atl/sdd-init-context.md` — records the pivot decision and explicitly defers stack selection to this exploration.
- `.atl/testing-capabilities.md` — records zero test infra today; stack choice determines what test runner becomes available going forward.
- No source code exists yet — every candidate below is a from-scratch build.

## Approaches

### 1. Local Electron/Tauri desktop app + Node.js backend, `mssql` (Tedious) driver
- **Pros**: True desktop app, no separate "start a server" step; can reuse React UI patterns/components from the v5 artifact (table, drawer, fingerprint) almost directly; `mssql`/Tedious is pure JS (no native ODBC driver install); can use OS-level secret storage (Electron `safeStorage`) instead of plaintext credentials.
- **Cons**: Electron adds packaging/build/auto-update/code-signing overhead arguably wasted for a single-user internal tool; heavier runtime footprint; business-rule logic (field resolution, FA matching, dedupe) currently lives only inside the Claude skill's instructions — porting it into deterministic JS is a separate, nontrivial effort.
- **Effort**: Medium–High

### 2. Locally-run web app — Node/Next.js (or Express) + React frontend, `mssql` driver, via `localhost`
- **Pros**: Reuses the most of v5's existing React UI code/patterns with the least friction; no Electron packaging; full control to implement backend logic (transactions, validation, business rules) in the same language the UI is already written in; `mssql` needs no separate native driver install.
- **Cons**: "How does MR start/keep this running" is unresolved without extra tooling (auto-start/tray icon); credential storage defaults to a `.env` file on a personal machine (mitigable with SQL Server Windows/Integrated auth, see open question 4); same business-logic-porting cost as Candidate 1.
- **Effort**: Medium

### 3. Python/FastAPI backend + lightweight frontend (Streamlit prototype, or FastAPI + React SPA), `pyodbc`/`pymssql` driver
- **Pros**: Python is a strong SQL Server client ecosystem and BI/data-analyst-friendly territory — plausibly closer to what MR (a BI consultant) is already comfortable with; a Streamlit prototype can stand up a working review UI very fast; Python's data/matching libraries (`pandas`, `rapidfuzz`) are a natural fit if the app should absorb the field-resolution/FA-matching logic currently done by Claude.
- **Cons**: `pyodbc` requires a separate OS-level ODBC driver install (Microsoft ODBC Driver 17/18); Streamlit is not built for the level of custom interactivity the v5 UI already has (per-cell drawer, texture+color legend, 9-tick "fingerprint", 3-mode FA reassignment) — likely a real UI downgrade unless a full FastAPI+React combo is chosen instead, reintroducing two-ecosystem complexity.
- **Effort**: Low (Streamlit prototype) to Medium (FastAPI + React)

### 4. .NET/C# — WPF/WinForms desktop app, or ASP.NET Core (Blazor) run locally, `Microsoft.Data.SqlClient` driver
- **Pros**: `Microsoft.Data.SqlClient` is the first-party, most mature SQL Server driver available (MARS, Always Encrypted, connection resiliency); trivial support for **Windows Integrated Authentication** — if MR's Windows/AD account already has direct SQL Server access (plausible, since she already uses SSMS), this could eliminate stored DB credentials entirely; a WPF/WinForms desktop build is a single native .exe, no browser/Node/Electron runtime; `SqlTransaction` maps cleanly onto reproducing the BEGIN-TRAN/manual-review safety pattern in actual code.
- **Cons**: Zero reuse of the existing React UI/component work — a full UI rebuild in a different paradigm; no evidence MR or any collaborator has .NET/C# experience, whereas React was already chosen for v5 and Python is BI-adjacent — the least-validated skill fit of the four candidates; Blazor Server reintroduces the local-hosting question without the React-reuse benefit.
- **Effort**: Medium (if .NET familiarity already exists) to High (starting cold)

## Recommendation

This is exploration, not a proposal — no winner is picked here. Three decision axes should drive the eventual choice in `sdd-propose`:

- **If "reuse the existing React UI investment" matters most** → Candidate 1 or 2 (Electron or local web app).
- **If "minimize credential risk against a production financial-services DB" matters most** → Candidate 4 (.NET), but only if MR's account already has direct DB access outside SSMS-only tooling (unverified — see open question 4).
- **If "does the app need to absorb the Claude skill's analysis/matching logic" resolves to "yes, fully"** → Candidate 3 (Python) has the strongest ecosystem fit, independent of UI framework.

None of the four candidates change the requirement to explicitly redesign the "commented COMMIT/ROLLBACK forces manual review" safety property for a live-connected app.

## Risks

1. **Safety regression risk**: the orphaned `BEGIN TRAN` incident (PRD §8) was mitigated by forcing manual SSMS review before commit. A live-connected app that can execute SQL directly removes that manual gate by default — every candidate needs an explicit design answer for what stops accidental commits of partial/wrong data to production.
2. **Business-logic duplication/drift risk**: none of the field-resolution/FA-matching/dedupe rules described in the PRD exist as code anywhere — they live in the Claude skill's instructions. Any candidate that reimplements them risks drifting from the skill's actual behavior unless the "replace vs. complement Claude" question is resolved first.
3. **Credential-handling risk**: every non-.NET candidate needs an explicit decision on how DB credentials are stored/protected on a personal machine used for production writes.
4. **Zero test infra**: whichever stack is chosen determines the available test runner; the global Strict TDD policy is unenforceable until that choice is made.
5. **Skill-fit/maintenance risk**: unknown whether MR (or anyone) will maintain this code going forward vs. it remaining fully AI-assisted — materially changes how much tooling overhead (Electron packaging, CI, .NET onboarding) is worth taking on.

## Open Product Questions (resolve before sdd-propose)

1. Does the new app replace the Claude-based analysis step (`gestion-fa-codes-sql` — field resolution, duplicate detection, FA matching) with its own backend logic, or does it still receive analysis results from Claude and only add live DB write capability?
2. Deployment target: does this run locally on MR's own machine only, or does it need to be reachable/hosted elsewhere?
3. What replaces the "commented COMMIT/ROLLBACK forces manual review" safety property once the app can write directly to YHat (e.g., a staged/dry-run preview step, an explicit two-step confirm, something else)?
4. Does MR's account already have direct SQL Server access to YHat (e.g., Windows/AD integrated auth, as presumably used today in SSMS), or does the new app need its own SQL-auth credentials?
5. Who will build and maintain this code — MR herself, an AI-assisted workflow with no dedicated developer, or someone else with an existing language/framework preference?
6. Realistic usage volume/frequency (batch size, sessions per week) — informs whether a lightweight local script is sufficient or an always-running/packaged app is worth the overhead.

## Architecture Decisions (post-exploration clarification, 2026-08-28)

The user answered the four open questions above with a direction not covered by Candidates 1–4: instead of a standalone app talking to SQL Server through a driver, the connection layer is a **custom MCP (Model Context Protocol) server**.

- **Connection/interface (resolves open questions 1 and 4)**: A custom MCP server exposes both **read and write** access to YHat SQL Server as MCP tools. The interface consuming it is **Claude directly, in chat** (Claude Desktop/Code) — not a standalone web/desktop UI. This effectively retires the "which frontend framework" axis entirely: there is no separate app UI to build: the v5 React artifact's table/drawer/fingerprint UI is not being carried forward as a live interface; the `gestion-fa-codes-sql` skill (or its successor) becomes the thing that calls the MCP server's tools instead of working from a CSV snapshot and asking the user to paste JSON into an artifact.
- **Deployment (resolves open question 2)**: Hosted, packaged with **Docker**, specifically so the MCP server can be moved between machines/environments.
- **Safety property (resolves open question 3)**: **Preview/dry-run + explicit confirmation** — the MCP server (or the skill orchestrating it) must expose a way to preview the planned change (equivalent to today's generated-but-uncommitted T-SQL) before an explicit, separate confirmation step actually writes to production. This directly replaces the old "commented COMMIT/ROLLBACK in a script MR reviews in SSMS" gate — the equivalent gate must exist as two distinct MCP tool calls (or a tool + confirmation parameter), never a single call that both plans and commits.

**Consequence for Candidates 1–4**: all four assumed a standalone app (desktop or local web) as the primary deliverable and UI, and none anticipated an *already-existing* shared MCP server. That framing is now superseded.

## Discovery: `yhat-mcp-server` already exists (2026-08-28)

The user pointed at a sibling repo, `C:\Users\KelvinMiranda\Desktop\Yhat\yhat-mcp-server` — a real, already-implemented, already-deployed MCP server (TypeScript, `@modelcontextprotocol/server@^2.0.0-beta.3`, `mssql` driver), running in Docker on Yhat's Linux bastion, consumed today by Claude Desktop/Cursor/VS Code. Key facts that reshape this exploration:

- **Read-only today, no writes**: two tools exist — `yhat_query` (raw SQL, admin-only, AST-classified to allow only `SELECT`) and `yhat_query_entities` (semantic entity queries, all roles, compiled to T-SQL server-side). No INSERT/UPDATE/DELETE path exists anywhere in the codebase.
- **Explicit no-UI decision already made in that project**: its own PRD states *"No provee interfaz gráfica propia; el punto de entrada es siempre un cliente MCP (Claude Desktop, Cursor, VS Code)."* — `yhat-mcp-server` will not host or become a UI. Any UI for `facodes` must be a separate service that consumes `yhat-mcp-server` as an MCP client.
- **A write flow was designed but never built**: the original PRD (Python-era draft, since superseded by the shipped TS implementation) described: detect INSERT → verify table is writer-permitted → request explicit confirmation → execute → audit-log. The shipped Phase-1 deliberately deferred all of this — every role, including admin, is read-only today.
- **Auth**: SQL Server auth only (no Windows/AD integrated auth in the driver config) — credentials live in env vars with optional OS-keychain storage, held by the MCP server itself. The HTTP `/mcp` endpoint is additionally gated by a shared internal-identity header + Host allowlist behind a VPN-restricted Caddy TLS proxy.
- **Shared-service context**: PRD cites other consuming clients/stakeholders (NinetyOne, AMCS, EDR, Skandia) with real audit-trail requirements — this is not a facodes-private server.

## Final Architecture Decisions (2026-08-28, second round)

- **Interface**: a **new, separate Dockerized UI service owned by `facodes`** — the spiritual successor of the v5 artifact's table/drawer/fingerprint review UI — that acts as an **MCP client** consuming `yhat-mcp-server`. `yhat-mcp-server` itself will not gain a UI (confirmed out of scope there).
- **Reads**: via `yhat-mcp-server`'s existing tools (`yhat_query_entities` primarily; `yhat_query` if admin-level raw SQL is ever needed) — no new read infrastructure needed, this already works today.
- **Writes**: the user decided to **extend `yhat-mcp-server` itself** with write tools, rather than stand up a separate write-only MCP server. This directly revives that project's own deferred PRD design (writer-role table whitelist → explicit confirmation → execute → audit log) rather than reinventing it. **This is cross-project work**: adding write tools to `yhat-mcp-server` is a change in that repository/project, with its own SDD lifecycle, not something `sdd-apply` for `facodes` can do directly. `facodes`' own scope is the UI/MCP-client side; the write-tools extension should be tracked as a change in the `yhat-mcp-server` project and treated as an external dependency here.
- **Safety property**: resolved by construction — `yhat-mcp-server`'s own (previously unimplemented) confirmation-flow design *is* the preview/dry-run + explicit-confirmation pattern the user asked for. The `facodes` UI, as the MCP client, is responsible for rendering that approval-request signal and requiring an explicit user action before the confirming call is made — this is the direct successor to the old commented-COMMIT/ROLLBACK gate.
- **Credentials (resolves prior open question 4)**: `facodes` does **not** need its own SQL Server credentials at all — it never talks to SQL Server directly, only to `yhat-mcp-server` over MCP. `facodes` only needs whatever internal-identity/access credential `yhat-mcp-server`'s HTTP mode requires (the shared internal-identity header + network/Host allowlist), which is a much smaller credential-handling surface than a direct DB connection.

**Remaining open items for `facodes`' own `sdd-propose`/`sdd-design`**:
- Stack/framework for the new Dockerized UI service (React is a natural carryover from v5 for UI patterns; TypeScript is a natural fit for writing the MCP client side too, given `yhat-mcp-server` itself is TS).
- Exact UX for surfacing the yhat-mcp-server write-confirmation signal in the review UI (map it onto the existing table/drawer/fingerprint review flow).
- How `facodes`' Docker service is deployed relative to `yhat-mcp-server` (same bastion/compose network vs. separate).
- Coordination point: the write-tools extension to `yhat-mcp-server` must exist (or be scoped in parallel) before `facodes` can implement its write path end-to-end — track as a cross-project dependency, not a `facodes` task.

## Ready for Proposal

**Yes.** All four originally-blocking open questions are now resolved. `sdd-propose` for `facodes` can proceed scoped to the UI/MCP-client side; the `yhat-mcp-server` write-tools extension should be raised as a separate, explicitly-flagged external dependency rather than absorbed into `facodes`' own proposal.

## Key Learnings

1. The FACodes repository has no source code yet; the only content is `PRD_revision_facodes.md` and `.atl/` notes from `sdd-init`.
2. The prior v5 artifact's commented-COMMIT/ROLLBACK safety pattern exists specifically because an orphaned `BEGIN TRAN` once locked the production `Codes` table.
3. Node's `mssql` package (Tedious) requires no separate native ODBC driver, while Python's `pyodbc` requires installing the Microsoft ODBC Driver for SQL Server separately.
4. `Microsoft.Data.SqlClient` uniquely supports Windows Integrated Authentication, which could eliminate stored SQL credentials if MR's account already has direct DB access.
