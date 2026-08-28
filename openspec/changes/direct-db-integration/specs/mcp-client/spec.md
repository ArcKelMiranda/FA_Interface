# Delta for mcp-client (`yhat-mcp-client`)

## ADDED Requirements

### Requirement: Live Read via MCP Tools

The system MUST retrieve all batch and reference data used by the review UI by calling `yhat-mcp-server` MCP tools (`yhat_query_entities` for semantic entity queries; `yhat_query` for admin-level raw `SELECT` when required). The system MUST NOT accept a pasted JSON blob as a data source for batch content.

#### Scenario: Batch data is fetched live

- GIVEN a user-selected batch identifier or query
- WHEN the system loads that batch
- THEN it issues one or more `yhat_query_entities` (or `yhat_query`) calls to `yhat-mcp-server`
- AND the rendered data reflects the live response, not a cached snapshot file

### Requirement: Internal-Identity Authentication

The system MUST authenticate its HTTP connection to `yhat-mcp-server` using the shared internal-identity credential/header required by that server's HTTP mode. The system MUST NOT hold, request, or transmit any SQL Server credential.

#### Scenario: Connection is established with the internal-identity header

- GIVEN the facodes service starts and needs to reach `yhat-mcp-server`
- WHEN it issues its first MCP call
- THEN the call includes the configured internal-identity credential/header
- AND no SQL Server connection string or credential exists anywhere in the service's configuration

### Requirement: Read Failure Blocks the Affected Batch

The system MUST treat a failed or timed-out MCP read as a blocking error for the batch (or batch section) it was fetching, and MUST display a visible error rather than silently rendering partial or stale data.

#### Scenario: MCP call fails

- GIVEN an in-flight `yhat_query_entities` call for a batch
- WHEN the call returns an error response
- THEN the batch is marked as failed to load
- AND a visible, actionable error message is shown to the user
- AND no rows from that failed call are added to the table

#### Scenario: MCP call times out

- GIVEN an in-flight MCP call that exceeds a defined bounded wait time
- WHEN the timeout elapses without a response
- THEN the call is treated as failed per the same blocking-error behavior
- AND the UI does not display an indefinite loading indicator beyond that bound

### Requirement: Explicit Empty-State Rendering

The system MUST render a distinct, explicit empty-state indicator when a live query completes successfully but returns zero matching records, distinguishable from both the loading state and the error state.

#### Scenario: Query returns zero records

- GIVEN a live query that completes without error and returns no records
- WHEN the response is processed
- THEN the system displays an explicit "no results" indicator
- AND this indicator is visually distinct from the loading spinner and the error message

## Key Learnings

1. `yhat-mcp-server` already implements `yhat_query_entities` and `yhat_query` as read-only tools; no new read infrastructure is needed on that side.
2. facodes never holds SQL Server credentials; it authenticates to `yhat-mcp-server` only via an internal-identity header behind a VPN-restricted proxy.
