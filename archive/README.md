# Archive — v5 Rollback Prerequisite

This directory is the rollback safety net required before any part of
`direct-db-integration` merges (`tasks.md` Phase 0, task 0.1; `design.md`
Migration/Rollout, step 1).

## What is actually archived here

`PRD_revision_facodes.md` — a verbatim copy of the repository-root PRD
describing the v5 Claude.ai artifact: its architecture, feature set,
JSON contract (§6), design decisions and their rationale (§7), known
incidents (§8), and version history (§11).

## What is NOT archived here, and why

`tasks.md` (as originally written) asked for `archive/v5-artifact.jsx` — a
copy of the v5 React artifact's source code. **That file does not exist
anywhere in this repository, on local disk, or in any location this agent
or the maintainer has access to.** The v5 artifact was built and has only
ever lived inside a Claude.ai conversation's artifact system; it was never
exported, downloaded, or committed to this repo (confirmed: this repo had
zero commits and no `.jsx`/`.tsx` source files before this change).

This is a real gap, not a formality:

- **True code-level rollback to v5 is not possible from this repository.**
  If `direct-db-integration` needs to be reverted after merge, there is no
  v5 source to restore — only this PRD, which documents *what* v5 did and
  *why*, not *how* (no component code, no SQL-generation logic, no
  localStorage schema implementation).
- Recovering the actual v5 source, if ever needed, requires retrieving it
  from Claude.ai conversation history directly (outside this repo's
  version control) — assuming that history is still accessible.
- Practical rollback for this change is therefore **behavioral, not
  code-level**: stop using the new facodes service and go back to the v5
  workflow described in this PRD (paste JSON into the Claude.ai artifact
  conversation where it still lives), not `git revert` plus redeploying
  v5's own source.

Do not treat this PRD copy as a substitute for the missing source — it
preserves the specification and rationale, not the implementation.
