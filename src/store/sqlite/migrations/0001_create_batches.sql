-- Persisted BatchAnalysis snapshots (spec persistence — Restart Survival,
-- Batch Retrieval by Reference). `id` is the batch reference used by
-- ReviewStateStore.loadBatch/saveBatch (String(batchNo)); `data` holds the
-- full validated BatchAnalysis JSON blob.
CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  batch_no INTEGER NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
