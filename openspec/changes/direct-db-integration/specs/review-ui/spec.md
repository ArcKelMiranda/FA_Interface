# Delta for review-ui (`fa-code-review-ui`)

## ADDED Requirements

### Requirement: Live Batch Table Rendering

The system MUST render a batch of FA codes as a table with one row per code, showing BranchRep, Rep Name, assigned FA(s), and all eight resolution fields (Office, Country, Region, IBD, NSCC, Dealer, Agente, Origin), sourced from a live MCP read — never from a pasted JSON blob.

#### Scenario: Batch renders from a live read

- GIVEN a batch identifier selected by the user
- WHEN the batch loads successfully via the MCP client
- THEN the table renders one row per code with BranchRep, Rep Name, FA(s), and the eight fields populated
- AND no JSON-paste step is presented anywhere in the flow

### Requirement: Accessibility-Safe Status Encoding

The system MUST encode each field's and each row's status using a combination of color AND a distinct non-color visual attribute (texture, pattern, or icon). The system MUST NOT rely on color as the sole differentiator for any status value. Status values are: `resolved`, `needs_confirm`, `needs_input`, `no_data`.

#### Scenario: Status is distinguishable without color

- GIVEN a rendered table or drawer field with a status of `needs_confirm`
- WHEN color is removed or unavailable (grayscale rendering, color-blind simulation)
- THEN the status remains identifiable solely from its texture/pattern/icon attribute
- AND every one of the four status values maps to a unique non-color attribute

#### Scenario: Legend is filterable

- GIVEN the status legend is visible
- WHEN the user clicks a legend entry
- THEN the table filters to rows/fields matching that status only

### Requirement: Per-Row Fingerprint Summary

The system MUST render a nine-tick fingerprint per row (one tick per FA slot plus one per each of the eight fields), where each tick reflects that item's current status and is clickable.

#### Scenario: Fingerprint tick opens the matching drawer section

- GIVEN a row's fingerprint with nine ticks
- WHEN the user clicks a tick corresponding to a specific field
- THEN the drawer opens focused on that exact field

### Requirement: Per-Field Drawer

The system MUST open a drawer on cell or fingerprint-tick click, showing the field's current value, evidence, precedent codes, suggested alternatives, and a catalog search control for non-FA fields.

#### Scenario: Drawer shows evidence and alternatives

- GIVEN a code with a `needs_confirm` field
- WHEN the user opens that field's drawer
- THEN the drawer displays the current value, its evidence text, and any suggested alternatives
- AND the user can accept the suggestion or mark the field for further review

### Requirement: Batch Load Failure Blocks Rendering

The system MUST NOT render a partial or stale table when the underlying live MCP read for a batch fails or times out.

#### Scenario: Failed live read shows a blocking error, not a partial table

- GIVEN a batch load request that fails or times out against `yhat-mcp-server`
- WHEN the failure is detected
- THEN the system displays a visible, batch-scoped error message
- AND no partial or cached row data for that batch is rendered in the table

## Key Learnings

1. The review UI's four status values (resolved, needs_confirm, needs_input, no_data) come from PRD v5 §5.2 and carry forward unchanged.
2. The nine-tick fingerprint maps to one FA slot plus the eight resolution fields per code row.
