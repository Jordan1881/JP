import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type pg from "pg";
import { createPool } from "@backend/db/pool.js";
import { resolveDatabaseConfig } from "@backend/db/config.js";
import { runMigrations } from "@backend/db/migrate.js";
import { migrations } from "@backend/db/migrations/index.js";
import {
  ProfileRepository,
  PostgresProfileStore,
} from "@backend/modules/profile-repository/index.js";

const databaseConfigured = Boolean(
  process.env.DATABASE_URL || process.env.DATABASE_HOST,
);

const USER = "pg-profile-user";

// Integration test — requires a real Postgres (see docs/infra/database.md).
describe.skipIf(!databaseConfigured)("PostgresProfileStore", () => {
  let pool: pg.Pool;
  let store: PostgresProfileStore;

  beforeAll(async () => {
    const config = resolveDatabaseConfig();
    if (!config) {
      throw new Error("Database config missing despite env gate");
    }
    pool = createPool(config);
    await runMigrations(pool, migrations);
    store = new PostgresProfileStore(pool);
  });

  beforeEach(async () => {
    await pool.query(
      "DELETE FROM career_profiles WHERE user_id LIKE 'pg-profile-%'",
    );
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("round-trips a completed interview profile with structured fields", async () => {
    const repository = new ProfileRepository(store);

    const saved = await repository.saveInterviewProfile(USER, {
      techStack: ["TypeScript", "React", "Postgres"],
      targetRoles: ["Full-stack Engineer"],
      seniority: "Senior",
      yearsOfExperience: 7.5,
      locationPreference: "Tel Aviv",
      remotePreference: "Hybrid",
      salaryExpectations: "Market",
      notableProjects: "JP Job Player",
      softSkills: "Communication",
      careerNarrative: "Builder of tools",
    });

    expect(saved.interviewCompletedAt).toBeTruthy();
    expect(repository.isComplete(saved)).toBe(true);

    const fetched = await repository.get(USER);
    expect(fetched).toEqual(saved);
    expect(fetched?.techStack).toEqual(["TypeScript", "React", "Postgres"]);
    expect(fetched?.yearsOfExperience).toBe(7.5);
  });

  it("updates an existing profile and preserves interviewCompletedAt", async () => {
    const repository = new ProfileRepository(store);
    const saved = await repository.saveInterviewProfile(USER, {
      techStack: ["TypeScript"],
      targetRoles: ["Backend"],
      seniority: "Mid",
      yearsOfExperience: 3,
    });

    await repository.update(USER, { seniority: "Senior" });

    const fetched = await repository.get(USER);
    expect(fetched?.seniority).toBe("Senior");
    expect(fetched?.techStack).toEqual(["TypeScript"]);
    expect(fetched?.interviewCompletedAt).toBe(saved.interviewCompletedAt);
  });

  it("deletes the profile for a user", async () => {
    const repository = new ProfileRepository(store);
    await repository.saveInterviewProfile(USER, { seniority: "Senior" });

    await repository.deleteByUser(USER);

    expect(await repository.get(USER)).toBeNull();
  });
});
