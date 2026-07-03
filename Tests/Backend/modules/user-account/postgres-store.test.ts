import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type pg from "pg";
import { CURRENT_TERMS_VERSION } from "@jp/shared-types";
import { createPool } from "@backend/db/pool.js";
import { resolveDatabaseConfig } from "@backend/db/config.js";
import { runMigrations } from "@backend/db/migrate.js";
import { migrations } from "@backend/db/migrations/index.js";
import {
  createUserAccountRepository,
  PostgresUserAccountStore,
} from "@backend/modules/user-account/index.js";
import { PostgresJobStore } from "@backend/modules/job-repository/index.js";
import { createJobRepository } from "@backend/modules/job-repository/index.js";
import { PostgresProfileStore } from "@backend/modules/profile-repository/index.js";
import { PostgresUserPreferencesStore } from "@backend/modules/user-preferences/index.js";
import { PostgresNotificationStore } from "@backend/modules/notification-center/index.js";
import { NotificationCenter } from "@backend/modules/notification-center/index.js";

const databaseConfigured = Boolean(
  process.env.DATABASE_URL || process.env.DATABASE_HOST,
);

const USER = "pg-acct-user";

// Integration test — requires a real Postgres (see docs/infra/database.md).
describe.skipIf(!databaseConfigured)("PostgresUserAccountStore", () => {
  let pool: pg.Pool;
  let store: PostgresUserAccountStore;
  let jobStore: PostgresJobStore;

  beforeAll(async () => {
    const config = resolveDatabaseConfig();
    if (!config) {
      throw new Error("Database config missing despite env gate");
    }
    pool = createPool(config);
    await runMigrations(pool, migrations);
    store = new PostgresUserAccountStore(pool);
    jobStore = new PostgresJobStore(pool);
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM jobs WHERE user_id LIKE 'pg-acct-%'");
    await pool.query(
      "DELETE FROM career_profiles WHERE user_id LIKE 'pg-acct-%'",
    );
    await pool.query(
      "DELETE FROM user_preferences WHERE user_id LIKE 'pg-acct-%'",
    );
    await pool.query(
      "DELETE FROM user_accounts WHERE user_id LIKE 'pg-acct-%'",
    );
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("records terms acceptance with version and timestamp on signup", async () => {
    const repository = createUserAccountRepository(store, jobStore);

    const account = await repository.create(USER, {
      name: "Jordan",
      email: "Jordan@Example.com",
      termsVersion: CURRENT_TERMS_VERSION,
    });

    expect(account.termsVersion).toBe(CURRENT_TERMS_VERSION);
    expect(account.termsAcceptedAt).toBeTruthy();
    expect(account.email).toBe("jordan@example.com");

    const fetched = await repository.get(USER);
    expect(fetched).toEqual(account);
  });

  it("updates name and photo and persists across reads", async () => {
    const repository = createUserAccountRepository(store, jobStore);
    await repository.create(USER, {
      name: "Jordan",
      email: "jordan@example.com",
      termsVersion: CURRENT_TERMS_VERSION,
    });

    await repository.update(USER, {
      name: "Jordan B",
      photoUrl: "https://example.com/photo.png",
    });

    const fetched = await repository.get(USER);
    expect(fetched?.name).toBe("Jordan B");
    expect(fetched?.photoUrl).toBe("https://example.com/photo.png");
  });

  it("re-records acceptance timestamp on acceptTerms", async () => {
    const repository = createUserAccountRepository(store, jobStore);
    const created = await repository.create(USER, {
      name: "Jordan",
      email: "jordan@example.com",
      termsVersion: CURRENT_TERMS_VERSION,
    });

    await new Promise((resolve) => setTimeout(resolve, 5));
    const reaccepted = await repository.acceptTerms(USER, {
      termsVersion: CURRENT_TERMS_VERSION,
    });

    expect(reaccepted.termsVersion).toBe(CURRENT_TERMS_VERSION);
    expect(reaccepted.termsAcceptedAt! >= created.termsAcceptedAt!).toBe(true);
  });

  it("deletes the account and all user-owned rows", async () => {
    const profileStore = new PostgresProfileStore(pool);
    const preferencesStore = new PostgresUserPreferencesStore(pool);
    const repository = createUserAccountRepository(
      store,
      jobStore,
      profileStore,
      preferencesStore,
    );
    const jobRepository = createJobRepository(jobStore);
    const notificationStore = new PostgresNotificationStore(pool);

    await repository.create(USER, {
      name: "Jordan",
      email: "jordan@example.com",
      termsVersion: CURRENT_TERMS_VERSION,
    });
    const job = await jobRepository.create(USER, {
      title: "Engineer",
      company: "Acme",
      submissionDate: "2026-01-15",
    });
    await profileStore.save({
      userId: USER,
      techStack: ["TypeScript"],
      targetRoles: ["Backend"],
      seniority: "Senior",
      yearsOfExperience: 7,
      locationPreference: "Tel Aviv",
      remotePreference: "Hybrid",
      salaryExpectations: "",
      notableProjects: "",
      softSkills: "",
      careerNarrative: "",
      interviewCompletedAt: new Date().toISOString(),
    });
    await preferencesStore.save({
      userId: USER,
      staleNotificationsEnabled: true,
      preDeletionWarningsEnabled: true,
      stageList: ["Applied"],
    });
    await new NotificationCenter(notificationStore).create({
      userId: USER,
      type: "stale_job",
      jobId: job.id,
      title: "Stale",
      message: "No update in 14 days",
    });

    await repository.delete(USER);

    expect(await repository.get(USER)).toBeNull();
    expect(await jobRepository.list(USER, { status: "all" })).toEqual([]);
    expect(await profileStore.get(USER)).toBeNull();
    expect(await preferencesStore.get(USER)).toBeNull();
    expect(await notificationStore.listByUser(USER)).toEqual([]);
  });
});
