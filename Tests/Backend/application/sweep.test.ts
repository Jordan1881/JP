import { beforeEach, describe, expect, it } from "vitest";
import type { Job } from "@jp/shared-types";
import { runUserSweep, type SweepDeps } from "@backend/application/index.js";
import {
  createJobRepository,
  InMemoryJobStore,
} from "@backend/modules/job-repository/index.js";
import {
  InMemoryNotificationStore,
  NotificationCenter,
} from "@backend/modules/notification-center/index.js";
import { SUBMITTED_RESUME_STAGE } from "@backend/modules/stage-pipeline-manager/index.js";
import {
  InMemoryUserPreferencesStore,
  UserPreferencesRepository,
} from "@backend/modules/user-preferences/index.js";

const USER = "sweep-user";
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

function createSweepDeps(): { deps: SweepDeps; jobStore: InMemoryJobStore } {
  const jobStore = new InMemoryJobStore();
  const preferencesStore = new InMemoryUserPreferencesStore();
  const notificationStore = new InMemoryNotificationStore();

  return {
    jobStore,
    deps: {
      jobRepository: createJobRepository(jobStore),
      preferencesRepository: new UserPreferencesRepository(preferencesStore),
      notificationCenter: new NotificationCenter(notificationStore),
    },
  };
}

describe("sweep orchestration", () => {
  let deps: SweepDeps;
  let jobStore: InMemoryJobStore;

  beforeEach(() => {
    ({ deps, jobStore } = createSweepDeps());
  });

  it("creates a stale notification for inactive jobs", async () => {
    await jobStore.insert(
      baseJob("stale-job", {
        stageHistory: { [SUBMITTED_RESUME_STAGE]: daysBefore(14) },
        submissionDate: daysBefore(14),
      }),
    );

    const result = await runUserSweep(deps, USER, NOW);

    expect(result.createdNotifications).toBe(1);
    expect(result.deletedJobs).toBe(0);

    const notifications = await deps.notificationCenter.list(USER);
    expect(
      notifications.some(
        (item) => item.type === "stale_job" && item.jobId === "stale-job",
      ),
    ).toBe(true);
  });

  it("warns before deletion and deletes expired archived jobs", async () => {
    await jobStore.insert(
      baseJob("warn-job", {
        status: "archived",
        archiveReason: "manual",
        archivedAt: daysBefore(25),
      }),
    );
    await jobStore.insert(
      baseJob("expired-job", {
        status: "archived",
        archiveReason: "no_response",
        archivedAt: daysBefore(30),
      }),
    );
    await jobStore.insert(
      baseJob("permanent-job", {
        status: "archived",
        archiveReason: "accepted",
        archivedAt: daysBefore(40),
        currentStage: "Accepted",
      }),
    );

    const result = await runUserSweep(deps, USER, NOW);

    expect(result.createdNotifications).toBe(1);
    expect(result.deletedJobs).toBe(1);

    const notifications = await deps.notificationCenter.list(USER);
    expect(
      notifications.some(
        (item) =>
          item.type === "pre_deletion_warning" && item.jobId === "warn-job",
      ),
    ).toBe(true);
    expect(notifications.some((item) => item.jobId === "permanent-job")).toBe(
      false,
    );

    expect(await deps.jobRepository.getById(USER, "expired-job")).toBeNull();
    expect(await deps.jobRepository.getById(USER, "permanent-job")).not.toBeNull();
  });
});
