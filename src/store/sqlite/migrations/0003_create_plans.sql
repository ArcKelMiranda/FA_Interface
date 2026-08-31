-- The currently active write plan per batch (design.md Write-Confirmation
-- Gate sequence: "API->>DB: persist plan (status = awaiting_confirmation)").
-- One row per batch; a new savePlan call for the same batch replaces it.
CREATE TABLE IF NOT EXISTS plans (
  batch_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  statements TEXT NOT NULL,
  affected_rows INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL
);
