import { describe, expect, it } from "vitest";
import type { Job, UserPreferences } from "@jp/shared-types";
import { runStalenessSweep } from "@backend/modules/staleness-scheduler/index.js";

const preferences: UserPreferences = {
  userId: "u1",
  staleNotificationsEnabled: true,
  preDeletionWarningsEnabled: true,
  stageList: ["Submitted resume"],
};

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
