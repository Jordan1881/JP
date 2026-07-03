import { describe, expect, it } from "vitest";
import type { AppNotification, Job, UserPreferences } from "@jp/shared-types";
import { runStalenessSweep } from "@backend/modules/staleness-scheduler/index.js";

const preferences: UserPreferences = {
  userId: "u1",
  staleNotificationsEnabled: true,
  preDeletionWarningsEnabled: true,
  stageList: ["Submitted resume"],
};

const staleJob: Job = {
  id: "j1",
  userId: "u1",
  title: "Engineer",
  company: "Acme",
  submissionDate: "2026-01-01T00:00:00.000Z",
  currentStage: "Submitted resume",
  stageHistory: { "Submitted resume": "2026-01-01T00:00:00.000Z" },
  status: "active",
  lastUpdatedAt: "2026-01-01T00:00:00.000Z",
};

function staleNotification(
  overrides: Partial<AppNotification>,
): AppNotification {
  return {
    id: "n1",
    userId: "u1",
    type: "stale_job",
    jobId: "j1",
    title: "Application needs attention",
    message: "stale",
    read: false,
    createdAt: "2026-01-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("StalenessScheduler", () => {
  it("emits stale notification after 14 days", () => {
    const jobs: Job[] = [
      {
        id: "j1",
        userId: "u1",
        title: "Engineer",
        company: "Acme",
        submissionDate: "2026-01-01T00:00:00.000Z",
        currentStage: "Submitted resume",
        stageHistory: { "Submitted resume": "2026-01-01T00:00:00.000Z" },
        status: "active",
        lastUpdatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const result = runStalenessSweep({
      jobs,
      notifications: [],
      preferences,
      now: new Date("2026-01-20T00:00:00.000Z"),
    });

    expect(result.staleNotifications).toHaveLength(1);
  });

  it("does not duplicate while a stale notification is unread", () => {
    const result = runStalenessSweep({
      jobs: [staleJob],
      notifications: [staleNotification({ read: false })],
      preferences,
      // 25 days after the unread notification was created — still no dup.
      now: new Date("2026-02-09T00:00:00.000Z"),
    });

    expect(result.staleNotifications).toHaveLength(0);
  });

  it("stays quiet within 14 days of a dismissed reminder", () => {
    const result = runStalenessSweep({
      jobs: [staleJob],
      notifications: [
        staleNotification({
          read: true,
          lastRemindedAt: "2026-01-20T00:00:00.000Z",
        }),
      ],
      preferences,
      now: new Date("2026-01-30T00:00:00.000Z"),
    });

    expect(result.staleNotifications).toHaveLength(0);
  });

  it("re-notifies 14 days after a stale reminder was dismissed (story 17)", () => {
    const result = runStalenessSweep({
      jobs: [staleJob],
      notifications: [
        staleNotification({
          read: true,
          lastRemindedAt: "2026-01-20T00:00:00.000Z",
        }),
      ],
      preferences,
      now: new Date("2026-02-03T00:00:00.000Z"),
    });

    expect(result.staleNotifications).toHaveLength(1);
  });

  it("respects notification toggles", () => {
    const jobs: Job[] = [
      {
        id: "j1",
        userId: "u1",
        title: "Engineer",
        company: "Acme",
        submissionDate: "2026-01-01T00:00:00.000Z",
        currentStage: "Submitted resume",
        stageHistory: { "Submitted resume": "2026-01-01T00:00:00.000Z" },
        status: "active",
        lastUpdatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const result = runStalenessSweep({
      jobs,
      notifications: [],
      preferences: { ...preferences, staleNotificationsEnabled: false },
      now: new Date("2026-01-20T00:00:00.000Z"),
    });

    expect(result.staleNotifications).toHaveLength(0);
  });
});
