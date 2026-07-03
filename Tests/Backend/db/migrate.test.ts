import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { createPool } from "@backend/db/pool.js";
import { resolveDatabaseConfig } from "@backend/db/config.js";
import { runMigrations } from "@backend/db/migrate.js";
import { migrations } from "@backend/db/migrations/index.js";

const databaseConfigured = Boolean(
  process.env.DATABASE_URL || process.env.DATABASE_HOST,
);

const EXPECTED_TABLES = [
  "user_accounts",
  "jobs",
  "career_profiles",
  "user_preferences",
  "notifications",
];

// Integration test — requires a real Postgres (set DATABASE_URL). CI provides
// a postgres service; locally: docker run --rm -e POSTGRES_PASSWORD=jp -p 5432:5432 postgres:15
describe.skipIf(!databaseConfigured)("database migrations", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    const config = resolveDatabaseConfig();
    if (!config) {
      throw new Error("Database config missing despite env gate");
    }
    pool = createPool(config);
    await pool.query(`
      DROP TABLE IF EXISTS
        schema_migrations, notifications, jobs,
        user_accounts, career_profiles, user_preferences
      CASCADE
    `);
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("applies all migrations to an empty database", async () => {
    const result = await runMigrations(pool, migrations);

    expect(result.applied).toEqual(migrations.map((migration) => migration.id));
    expect(result.skipped).toEqual([]);

    const { rows } = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'`,
    );
    const tableNames = rows.map((row) => row.table_name);
    for (const table of EXPECTED_TABLES) {
      expect(tableNames).toContain(table);
    }
  });

  it("is idempotent — a second run applies nothing", async () => {
    const result = await runMigrations(pool, migrations);

    expect(result.applied).toEqual([]);
    expect(result.skipped).toEqual(migrations.map((migration) => migration.id));
  });

  it("rejects invalid job status via check constraint", async () => {
    await expect(
      pool.query(
        `INSERT INTO jobs (id, user_id, title, company, submission_date,
                           current_stage, status, last_updated_at)
         VALUES ('job-bad', 'user-1', 'T', 'C', now(), 'Applied', 'bogus', now())`,
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it("cascades notification deletion when the referenced job is deleted", async () => {
    await pool.query(
      `INSERT INTO jobs (id, user_id, title, company, submission_date,
                         current_stage, status, last_updated_at)
       VALUES ('job-cascade', 'user-1', 'T', 'C', now(), 'Applied', 'active', now())`,
    );
    await pool.query(
      `INSERT INTO notifications (id, user_id, type, job_id, title, message, created_at)
       VALUES ('notif-1', 'user-1', 'stale_job', 'job-cascade', 'Stale', 'msg', now())`,
    );

    await pool.query("DELETE FROM jobs WHERE id = 'job-cascade'");

    const { rows } = await pool.query(
      "SELECT id FROM notifications WHERE id = 'notif-1'",
    );
    expect(rows).toEqual([]);
  });
});
