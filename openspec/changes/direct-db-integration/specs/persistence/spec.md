# Delta for persistence (`review-state-persistence`)

## ADDED Requirements

### Requirement: Restart Survival

The system MUST persist in-progress batch/review state (loaded batches, per-field and per-FA overrides, resolution statuses) server-side such that it survives a restart of the facodes service.

#### Scenario: Overrides survive a service restart

- GIVEN a batch with at least one user-applied override
- WHEN the facodes service is restarted
- THEN reopening that batch afterward shows the same override values and statuses as before the restart

### Requirement: Cross-Machine Resumability

The system MUST make persisted batch/review state resumable from a machine other than the one that originally created or modified it, without relying on browser `localStorage` as the source of truth.

#### Scenario: Resuming on a different machine

- GIVEN a batch with overrides created on machine A
- WHEN the same user opens facodes from machine B and selects that batch
- THEN the batch loads with the same overrides and statuses last saved from machine A

### Requirement: Durable Override Writes

The system MUST persist a confirmed override durably before acknowledging the action as complete to the user, such that an unexpected service interruption occurring immediately after acknowledgment does not lose that override.

#### Scenario: Crash immediately after confirming an override

- GIVEN the user confirms an override and the system acknowledges it as saved
- WHEN the service crashes or restarts immediately after that acknowledgment
- THEN the override is present when the batch is reopened

### Requirement: Batch Retrieval by Reference

The system MUST allow the user to retrieve a previously loaded batch's current state by an identifiable batch reference after a restart or a resume from another machine.

#### Scenario: Retrieving a known batch after restart

- GIVEN a batch reference (e.g., batch number) used before a restart
- WHEN the user requests that batch reference after the restart
- THEN the system returns the batch's last-persisted state, not a fresh/empty load

### Requirement: Single-User Scope

The system MUST support persistence for a single user's in-progress work at a time and is NOT required to resolve concurrent-editing conflicts between multiple simultaneous users of the same batch.

#### Scenario: No concurrent multi-user conflict handling required

- GIVEN the single-user usage assumption for this capability
- WHEN evaluating persistence behavior
- THEN no scenario in this spec requires conflict resolution, locking, or merge behavior for simultaneous edits by different users

## Key Learnings

1. Datastore technology for review-state-persistence (embedded SQLite vs. standalone Postgres vs. other) is an open design question deferred to `sdd-design`; these requirements are written at the behavioral level only.
2. `localStorage` alone was explicitly ruled insufficient by the proposal because it cannot satisfy cross-machine resumability.
