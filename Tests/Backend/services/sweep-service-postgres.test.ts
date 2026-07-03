import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type pg from "pg";
import type { Job } from "@jp/shared-types";
import { runDailySweep } from "@backend/services/sweep-service.js";
import {
  getJobRepository,
  getNotificationCenter,
  getPool,
  getUserPreferencesRepository,
} from "@backend/services/store-provider.js";
import { PostgresJobStore } from "@backend/modules/job-repository/index.js";
import { SUBMITTED_RESUME_STAGE } from "@backend/modules/stage-pipeline-manager/index.js";

const databaseConfigured = Boolean(
  process.env.DATABASE_URL || process.env.DATABASE_HOST,
);

const USER = "pg-sweep-user";
const NOW = new Date("2026-03-01T06:00:00.000Z");

function daysBefore(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function baseJob(id: string, overrides: Partial<Job>): Job {
  const submitted = daysBefore(60);
  return {
    id,
    userId: USER,
    title: `Job ${id}`,
    company: "Acme",
    submissionDate: submitted,
    currentStage: SUBMITTED_RESUME_STAGE,
    stageHistory: { [SUBMITTED_RESUME_STAGE]: submitted },
    status: "active",
    lastUpdatedAt: submitted,
    ...overrides,
  };
}

// Integration test for issue #45 — the daily sweep pipeline
// (runStalenessSweep + sweep-service) operating on Postgres-backed stores
// through the store provider, with a fixed clock.
describe.skipIf(!databaseConfigured)("daily sweep on Postgres", () => {
  let pool: pg.Pool;
  let jobStore: PostgresJobStore;

  beforeAll(async () => {
    const maybePool = await getPool();
    if (!maybePool) {
      throw new Error("Store provider returned no pool despite env gate");
    }
    pool = maybePool;
    jobStore = new PostgresJobStore(pool);
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM jobs WHERE user_id = $1", [USER]);
    await pool.query("DELETE FROM user_preferences WHERE user_id = $1", [USER]);
  });

  it("emits a stale notification at day 14 and reflects it in the unread count", async () => {
    await jobStore.insert(
      baseJob("sweep-stale", {
        stageHistory: { [SUBMITTED_RESUME_STAGE]: daysBefore(14) },
        submissionDate: daysBefore(14),
      }),
    );

    const result = await runDailySweep(USER, NOW);
    expect(result.createdNotifications).toBe(1);

    const center = await getNotificationCenter();
    const notifications = await center.list(USER);
    const stale = notifications.find(
      (item) => item.type === "stale_job" && item.jobId === "sweep-stale",
    );
    expect(stale).toBeDefined();
    expect(stale?.read).toBe(false);
    expect(await center.unreadCount(USER)).toBe(
      notifications.filter((item) => !item.read).length,
    );
  });

  it("does not duplicate while unread, re-notifies 14 days after dismissal", async () => {
    await jobStore.insert(
      baseJob("sweep-repeat", {
        stageHistory: { [SUBMITTED_RESUME_STAGE]: daysBefore(20) },
        submissionDate: daysBefore(20),
      }),
    );

    await runDailySweep(USER, NOW);
    // Second sweep while the notification is still unread — no duplicate.
    const second = await runDailySweep(USER, NOW);
    expect(second.createdNotifications).toBe(0);

    const center = await getNotificationCenter();
    const first = (await center.list(USER)).find(
      (item) => item.jobId === "sweep-repeat",
    );
    expect(first).toBeDefined();

    // Dismiss now; 10 days later stays quiet, 14 days later re-notifies.
    await center.markRead(USER, first!.id, NOW.toISOString());

    const tenDaysOn = new Date(NOW.getTime() + 10 * 24 * 60 * 60 * 1000);
    expect((await runDailySweep(USER, tenDaysOn)).createdNotifications).toBe(0);

    const fourteenDaysOn = new Date(NOW.getTime() + 14 * 24 * 60 * 60 * 1000);
    expect(
      (await runDailySweep(USER, fourteenDaysOn)).createdNotifications,
    ).toBe(1);
  });

  it("warns at day 25 for manual archives and deletes at day 30", async () => {
    await jobStore.insert(
      baseJob("sweep-warn", {
        status: "archived",
        archiveReason: "manual",
        archivedAt: daysBefore(25),
      }),
    );
    await jobStore.insert(
      baseJob("sweep-expired", {
        status: "archived",
        archiveReason: "no_response",
        archivedAt: daysBefore(30),
      }),
    );
    // Permanent archive (accepted) — never warned, never deleted.
    await jobStore.insert(
      baseJob("sweep-permanent", {
        status: "archived",
        archiveReason: "accepted",
        archivedAt: daysBefore(40),
        currentStage: "Accepted",
      }),
    );

    const result = await runDailySweep(USER, NOW);
    expect(result.deletedJobs).toBe(1);

    const center = await getNotificationCenter();
    const notifications = await center.list(USER);
    expect(
      notifications.some(
        (item) =>
          item.type === "pre_deletion_warning" && item.jobId === "sweep-warn",
      ),
    ).toBe(true);
    expect(
      notifications.some((item) => item.jobId === "sweep-permanent"),
    ).toBe(false);

    const repository = await getJobRepository();
    expect(await repository.getById(USER, "sweep-expired")).toBeNull();
    expect(await repository.getById(USER, "sweep-permanent")).not.toBeNull();
  });

  it("skips notifications when the user preference toggles are off (story 48)", async () => {
    const preferencesRepository = await getUserPreferencesRepository();
    await preferencesRepository.update(USER, {
      staleNotificationsEnabled: false,
      preDeletionWarningsEnabled: false,
    });

    await jobStore.insert(
      baseJob("sweep-toggled-stale", {
        stageHistory: { [SUBMITTED_RESUME_STAGE]: daysBefore(20) },
        submissionDate: daysBefore(20),
      }),
    );
    await jobStore.insert(
      baseJob("sweep-toggled-warn", {
        status: "archived",
        archiveReason: "manual",
        archivedAt: daysBefore(26),
      }),
    );

    const result = await runDailySweep(USER, NOW);
    expect(result.createdNotifications).toBe(0);
  });
});
