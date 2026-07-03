import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type pg from "pg";
import { createPool } from "@backend/db/pool.js";
import { resolveDatabaseConfig } from "@backend/db/config.js";
import { runMigrations } from "@backend/db/migrate.js";
import { migrations } from "@backend/db/migrations/index.js";
import { DEFAULT_PIPELINE_STAGES } from "@backend/modules/stage-pipeline-manager/index.js";
import {
  UserPreferencesRepository,
  PostgresUserPreferencesStore,
} from "@backend/modules/user-preferences/index.js";

const databaseConfigured = Boolean(
  process.env.DATABASE_URL || process.env.DATABASE_HOST,
);

const USER = "pg-prefs-user";

// Integration test — requires a real Postgres (see docs/infra/database.md).
describe.skipIf(!databaseConfigured)("PostgresUserPreferencesStore", () => {
  let pool: pg.Pool;
  let store: PostgresUserPreferencesStore;

  beforeAll(async () => {
    const config = resolveDatabaseConfig();
    if (!config) {
      throw new Error("Database config missing despite env gate");
    }
    pool = createPool(config);
    await runMigrations(pool, migrations);
    store = new PostgresUserPreferencesStore(pool);
  });

  beforeEach(async () => {
    await pool.query(
      "DELETE FROM user_preferences WHERE user_id LIKE 'pg-prefs-%'",
    );
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("creates defaults on first access and persists them", async () => {
    const repository = new UserPreferencesRepository(store);

    const preferences = await repository.getOrCreate(USER);

    expect(preferences.staleNotificationsEnabled).toBe(true);
    expect(preferences.preDeletionWarningsEnabled).toBe(true);
    expect(preferences.stageList).toEqual([...DEFAULT_PIPELINE_STAGES]);

    expect(await store.get(USER)).toEqual(preferences);
  });

  it("persists custom stage list and notification toggles", async () => {
    const repository = new UserPreferencesRepository(store);

    await repository.update(USER, {
      staleNotificationsEnabled: false,
      stageList: ["Applied", "Home assignment", "Onsite"],
    });

    const fetched = await repository.getOrCreate(USER);
    expect(fetched.staleNotificationsEnabled).toBe(false);
    expect(fetched.preDeletionWarningsEnabled).toBe(true);
    expect(fetched.stageList).toEqual([
      "Applied",
      "Home assignment",
      "Onsite",
    ]);
  });

  it("deletes preferences for a user", async () => {
    const repository = new UserPreferencesRepository(store);
    await repository.getOrCreate(USER);

    await repository.deleteByUser(USER);

    expect(await store.get(USER)).toBeNull();
  });
});
