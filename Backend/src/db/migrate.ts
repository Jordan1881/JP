import type pg from "pg";

export interface Migration {
  /** Stable unique id, ordered lexicographically (e.g. "0001-initial-schema"). */
  id: string;
  up: string;
}

/** Arbitrary but fixed key so concurrent runners (deploy + Lambda) serialize. */
const MIGRATION_LOCK_KEY = 727_040;

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

/**
 * Apply pending migrations in order. Tracks applied ids in schema_migrations,
 * holds a Postgres advisory lock for the whole run, and wraps each migration
 * in its own transaction. Safe to call repeatedly (idempotent).
 */
export async function runMigrations(
  pool: pg.Pool,
  migrationList: Migration[],
): Promise<MigrationResult> {
  const client = await pool.connect();
  const result: MigrationResult = { applied: [], skipped: [] };

  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id          text PRIMARY KEY,
        applied_at  timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query<{ id: string }>(
      "SELECT id FROM schema_migrations",
    );
    const alreadyApplied = new Set(rows.map((row) => row.id));

    for (const migration of migrationList) {
      if (alreadyApplied.has(migration.id)) {
        result.skipped.push(migration.id);
        continue;
      }
      try {
        await client.query("BEGIN");
        await client.query(migration.up);
        await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [
          migration.id,
        ]);
        await client.query("COMMIT");
        result.applied.push(migration.id);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(
          `Migration ${migration.id} failed: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
    }

    return result;
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
    client.release();
  }
}
