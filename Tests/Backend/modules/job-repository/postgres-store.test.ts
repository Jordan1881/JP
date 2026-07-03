import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type pg from "pg";
import { createPool } from "@backend/db/pool.js";
import { resolveDatabaseConfig } from "@backend/db/config.js";
import { runMigrations } from "@backend/db/migrate.js";
import { migrations } from "@backend/db/migrations/index.js";
import {
  createJobRepository,
  PostgresJobStore,
} from "@backend/modules/job-repository/index.js";
import { SUBMITTED_RESUME_STAGE } from "@backend/modules/stage-pipeline-manager/index.js";

const databaseConfigured = Boolean(
  process.env.DATABASE_URL || process.env.DATABASE_HOST,
);

// Integration test — requires a real Postgres (see docs/infra/database.md).
describe.skipIf(!databaseConfigured)("PostgresJobStore via JobRepository", () => {
  let pool: pg.Pool;
  let store: PostgresJobStore;

  beforeAll(async () => {
    const config = resolveDatabaseConfig();
    if (!config) {
      throw new Error("Database config missing despite env gate");
    }
    pool = createPool(config);
    await runMigrations(pool, migrations);
    store = new PostgresJobStore(pool);
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM jobs WHERE user_id LIKE 'pg-test-%'");
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("round-trips a created job with stage history intact", async () => {
    const repository = createJobRepository(store);

    const created = await repository.create("pg-test-user", {
      title: "Software Engineer",
      company: "Acme Corp",
      submissionDate: "2026-01-15",
      jobNumber: "J-42",
      url: "https://example.com/job",
      description: "Backend role",
      notes: "Referral from Alex",
    });

    const fetched = await repository.getById("pg-test-user", created.id);
    expect(fetched).toEqual(created);
    expect(fetched?.currentStage).toBe(SUBMITTED_RESUME_STAGE);
    expect(fetched?.stageHistory[SUBMITTED_RESUME_STAGE]).toBe(
      created.submissionDate,
    );
  });

  it("is invisible to other users", async () => {
    const repository = createJobRepository(store);
    const created = await repository.create("pg-test-user", {
      title: "Engineer",
      company: "Acme",
      submissionDate: "2026-01-15",
    });

    expect(await repository.getById("pg-test-other", created.id)).toBeNull();
    expect(await repository.list("pg-test-other")).toEqual([]);
  });

  it("lists with filter, search, and sort applied", async () => {
    const repository = createJobRepository(store);
    const first = await repository.create("pg-test-user", {
      title: "Frontend Developer",
      company: "Pixel Co",
      submissionDate: "2026-01-01",
    });
    const second = await repository.create("pg-test-user", {
      title: "Backend Developer",
      company: "Acme Corp",
      submissionDate: "2026-01-02",
    });
    await repository.patch("pg-test-user", second.id, {
      stage: "Phone screen",
    });

    const byStage = await repository.list("pg-test-user", {
      stage: "Phone screen",
    });
    expect(byStage.map((job) => job.id)).toEqual([second.id]);

    const bySearch = await repository.list("pg-test-user", { q: "pixel" });
    expect(bySearch.map((job) => job.id)).toEqual([first.id]);

    const sorted = await repository.list("pg-test-user", {
      sortOrder: "desc",
    });
    expect(sorted[0]!.id).toBe(second.id);
  });

  it("patches stage and persists history across reads", async () => {
    const repository = createJobRepository(store);
    const created = await repository.create("pg-test-user", {
      title: "Engineer",
      company: "Acme",
      submissionDate: "2026-01-15",
    });

    await repository.patch("pg-test-user", created.id, {
      stage: "Technical interview",
    });

    const fetched = await repository.getById("pg-test-user", created.id);
    expect(fetched?.currentStage).toBe("Technical interview");
    expect(Object.keys(fetched!.stageHistory)).toContain(
      "Technical interview",
    );
    expect(fetched?.stageHistory[SUBMITTED_RESUME_STAGE]).toBe(
      created.submissionDate,
    );
  });

  it("auto-archives on terminal stage with the matching reason", async () => {
    const repository = createJobRepository(store);
    const created = await repository.create("pg-test-user", {
      title: "Engineer",
      company: "Acme",
      submissionDate: "2026-01-15",
    });

    const { terminalStageEvent } = await repository.patch(
      "pg-test-user",
      created.id,
      { stage: "Rejected" },
    );
    expect(terminalStageEvent?.stage).toBe("Rejected");

    const fetched = await repository.getById("pg-test-user", created.id);
    expect(fetched?.status).toBe("archived");
    expect(fetched?.archiveReason).toBe("rejected");
    expect(fetched?.archivedAt).toBeTruthy();
  });

  it("archives manually, restores, and permanently deletes", async () => {
    const repository = createJobRepository(store);
    const created = await repository.create("pg-test-user", {
      title: "Engineer",
      company: "Acme",
      submissionDate: "2026-01-15",
    });

    const archived = await repository.archiveManual("pg-test-user", created.id);
    expect(archived.status).toBe("archived");
    expect(archived.archiveReason).toBe("manual");

    const restored = await repository.restore("pg-test-user", created.id);
    expect(restored.status).toBe("active");
    expect(restored.archiveReason).toBeUndefined();
    expect(restored.archivedAt).toBeUndefined();

    await repository.deletePermanent("pg-test-user", created.id);
    expect(await repository.getById("pg-test-user", created.id)).toBeNull();
  });

  it("persists cover letter and announcement on the job row", async () => {
    const repository = createJobRepository(store);
    const created = await repository.create("pg-test-user", {
      title: "Engineer",
      company: "Acme",
      submissionDate: "2026-01-15",
    });

    await repository.patch("pg-test-user", created.id, {
      coverLetter: "Dear team, ...",
      announcement: "Excited to share ...",
    });

    const fetched = await repository.getById("pg-test-user", created.id);
    expect(fetched?.coverLetter).toBe("Dear team, ...");
    expect(fetched?.announcement).toBe("Excited to share ...");
  });

  it("lists user ids and deletes all jobs for a user", async () => {
    const repository = createJobRepository(store);
    await repository.create("pg-test-user", {
      title: "A",
      company: "A Co",
      submissionDate: "2026-01-15",
    });
    await repository.create("pg-test-user-2", {
      title: "B",
      company: "B Co",
      submissionDate: "2026-01-15",
    });

    const userIds = await store.listUserIds();
    expect(userIds).toContain("pg-test-user");
    expect(userIds).toContain("pg-test-user-2");

    await store.deleteByUser("pg-test-user");
    expect(await repository.list("pg-test-user", { status: "all" })).toEqual([]);
    expect(
      await repository.list("pg-test-user-2", { status: "all" }),
    ).toHaveLength(1);
  });
});
