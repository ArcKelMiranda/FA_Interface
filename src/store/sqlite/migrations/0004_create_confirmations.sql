-- Local audit trail of confirmation attempts (design.md Write-Confirmation
-- Gate sequence: "API->>DB: record the confirmation attempt (local audit
-- row)"). Append-only; never updated or deleted.
CREATE TABLE IF NOT EXISTS confirmations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  confirmed_at TEXT NOT NULL
);
