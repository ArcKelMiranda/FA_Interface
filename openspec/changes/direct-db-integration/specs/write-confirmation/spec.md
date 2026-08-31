# Delta for write-confirmation (`write-confirmation-gate`)

## ADDED Requirements

### Requirement: Full Write Preview Rendering

The system MUST render a complete preview of the planned write (equivalent in coverage to the prior generated-SQL preview: all `Codes`/`FAxCodes`/`FA`/`CodeOrigins` changes implied by the current batch state) once every field and FA in the batch is `resolved`.

#### Scenario: Preview renders when batch is fully resolved

- GIVEN a batch where every field and FA assignment across every code is `resolved`
- WHEN the user opens the write preview
- THEN the preview displays every planned insert/change for the batch, matching the current review-UI state exactly

### Requirement: Commit Action Disabled Until Upstream Write Tools Exist

The system MUST render the committing action as visibly disabled, with a stated reason referencing the missing upstream write capability, for as long as `yhat-mcp-server` has no write tools available. The system MUST NOT provide any alternate path (script export, workaround button, or other mechanism) that performs or substitutes for a commit while in this state.

#### Scenario: Commit control shows disabled with reason

- GIVEN `yhat-mcp-server` has not yet exposed write tools
- WHEN the user reaches the write preview
- THEN the commit action is rendered in a disabled state
- AND a stated reason ("write not yet available upstream" or equivalent) is visibly attached to it
- AND no alternate action available on the screen performs a write or generates a substitute script for manual execution

#### Scenario: Disabled state is accessible without color

- GIVEN the commit action is disabled
- WHEN rendered
- THEN its disabled state is conveyed through the disabled control attribute plus a non-color cue (icon, label text, or reduced-opacity pattern), not through color alone

### Requirement: Two-Step Explicit Confirmation (once write tools exist)

Once `yhat-mcp-server` exposes write tools, the system MUST require a distinct, explicit user confirmation action, separate from the action that requested the preview, before invoking the committing call. The system MUST NOT invoke any single action that both plans and commits a change.

#### Scenario: Commit requires a separate confirmation step

- GIVEN write tools are available upstream and a write preview is displayed
- WHEN the user requests the write
- THEN the system first calls the planning/approval-request tool and renders its response
- AND only a subsequent, distinct confirmation action invokes the committing call

### Requirement: Approval-Request Signal Rendering

The system MUST surface `yhat-mcp-server`'s approval-request signal as a distinct, visible element separate from the ordinary write preview, once that signal exists.

#### Scenario: Approval-request signal is visually distinct

- GIVEN a response from `yhat-mcp-server` carrying an approval-request signal
- WHEN the system renders it
- THEN it appears as a clearly distinguishable element from the general preview content, requiring explicit acknowledgment before the confirm action becomes available

## Key Learnings

1. The commit action MUST be spec'd as disabled-with-reason today; no scenario in this spec assumes a working write path, because `yhat-mcp-server` write tools do not exist yet.
2. This capability directly replaces the PRD v5 commented-COMMIT/ROLLBACK gate that followed a production table-locking incident.
