import { describe, expect, it } from "vitest";
import type { Job } from "@jp/shared-types";
import {
  archiveJob,
  isEligibleForDeletion,
  isPermanentArchive,
  restoreJob,
  shouldWarnBeforeDeletion,
} from "@backend/modules/archive-lifecycle-manager/index.js";

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: "j1",
    userId: "u1",
    title: "Engineer",
    company: "Acme",
    submissionDate: "2026-01-01T00:00:00.000Z",
    currentStage: "Submitted resume",
    stageHistory: {},
    status: "active",
    lastUpdatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("ArchiveLifecycleManager", () => {
  it("marks accepted archives as permanent", () => {
    const archived = archiveJob(job(), "accepted");
    expect(isPermanentArchive(archived)).toBe(true);
    expect(isEligibleForDeletion(archived, new Date("2026-12-01"))).toBe(false);
  });

  it("expires manual archives after 30 days", () => {
    const archived = archiveJob(job(), "manual", "2026-01-01T00:00:00.000Z");
    expect(
      isEligibleForDeletion(archived, new Date("2026-02-01T00:00:00.000Z")),
    ).toBe(true);
  });

  it("warns on day 25 for expiring archives", () => {
    const archived = archiveJob(job(), "manual", "2026-01-01T00:00:00.000Z");
    expect(
      shouldWarnBeforeDeletion(archived, new Date("2026-01-26T00:00:00.000Z")),
    ).toBe(true);
  });

  it("restores archived jobs to active", () => {
    const restored = restoreJob(archiveJob(job(), "manual"));
    expect(restored.status).toBe("active");
    expect(restored.archiveReason).toBeUndefined();
  });
});
