-- Per-field user overrides (spec persistence — Durable Override Writes).
-- One row per (batch, code, field); the latest putOverride call replaces
-- the previous value for that key.
CREATE TABLE IF NOT EXISTS overrides (
  batch_id TEXT NOT NULL,
  code_id TEXT NOT NULL,
  field TEXT NOT NULL,
  value TEXT NOT NULL,
  value_id INTEGER,
  overridden_at TEXT NOT NULL,
  PRIMARY KEY (batch_id, code_id, field)
);
