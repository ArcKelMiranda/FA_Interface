/**
 * Forward-only SQL migration runner for the SQLite review-state store
 * (design.md Decision 2 — "numbered SQL migrations applied at boot, same
 * pattern as yhat-mcp-server/src/migrate.ts"). Migrations are plain `.sql`
 * files under `migrations/`, named with a sortable numeric prefix
 * (`0001_create_batches.sql`, ...). Already-applied file names are tracked
 * in `schema_migrations` and are never re-run, edited in place, or rolled
 * back — a schema change ships as a NEW numbered file.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Database as DatabaseType } from "better-sqlite3";

export const DEFAULT_MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "migrations",
);

interface AppliedMigrationRow {
  version: string;
}

export function runMigrations(
  db: DatabaseType,
  migrationsDir: string = DEFAULT_MIGRATIONS_DIR,
): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
  );

  const appliedRows = db
    .prepare("SELECT version FROM schema_migrations")
    .all() as AppliedMigrationRow[];
  const applied = new Set(appliedRows.map((row) => row.version));

  const pendingFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .filter((file) => !applied.has(file));

  const recordApplied = db.prepare(
    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
  );

  for (const file of pendingFiles) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    const applyMigration = db.transaction(() => {
      db.exec(sql);
      recordApplied.run(file, new Date().toISOString());
    });
    applyMigration();
  }
}
