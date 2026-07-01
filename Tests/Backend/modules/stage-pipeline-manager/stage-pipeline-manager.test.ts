import { describe, expect, it, vi } from "vitest";
import type { Job } from "@jp/shared-types";
import {
  applyStageChange,
  getDisplayStages,
  resolvePipelineStages,
  SUBMITTED_RESUME_STAGE,
} from "@backend/modules/stage-pipeline-manager/index.js";

function sampleJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1",
    userId: "user-1",
    title: "Engineer",
    company: "Acme",
    submissionDate: "2026-01-01T00:00:00.000Z",
    currentStage: SUBMITTED_RESUME_STAGE,
    stageHistory: { [SUBMITTED_RESUME_STAGE]: "2026-01-01T00:00:00.000Z" },
    status: "active",
    lastUpdatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("StagePipelineManager", () => {
  it("includes Accepted and Rejected in the default pipeline", () => {
    const stages = resolvePipelineStages();
    expect(stages).toContain("Accepted");
    expect(stages).toContain("Rejected");
  });

  it("timestamps non-sequential forward stage changes", () => {
    const job = sampleJob();
    const result = applyStageChange(job, "Final interview", "2026-02-01T10:00:00.000Z");

    expect(result.job.currentStage).toBe("Final interview");
    expect(result.job.stageHistory["Final interview"]).toBe(
      "2026-02-01T10:00:00.000Z",
    );
    expect(result.terminalStageEvent).toBeUndefined();
  });

  it("allows backward stage moves and updates timestamps", () => {
    const job = sampleJob({
      currentStage: "Offer",
      stageHistory: {
        [SUBMITTED_RESUME_STAGE]: "2026-01-01T00:00:00.000Z",
        "Phone screen": "2026-01-10T00:00:00.000Z",
        Offer: "2026-02-01T00:00:00.000Z",
      },
    });

    const result = applyStageChange(job, "Phone screen", "2026-02-05T12:00:00.000Z");

    expect(result.job.currentStage).toBe("Phone screen");
    expect(result.job.stageHistory["Phone screen"]).toBe(
      "2026-02-05T12:00:00.000Z",
    );
  });

  it("emits terminal stage event for Accepted and Rejected", () => {
    const accepted = applyStageChange(sampleJob(), "Accepted");
    expect(accepted.terminalStageEvent).toEqual({
      jobId: "job-1",
      userId: "user-1",
      stage: "Accepted",
    });

    const rejected = applyStageChange(sampleJob(), "Rejected");
    expect(rejected.terminalStageEvent?.stage).toBe("Rejected");
  });

  it("includes visited stages in display list even if not in default pipeline", () => {
    const job = sampleJob({
      stageHistory: {
        [SUBMITTED_RESUME_STAGE]: "2026-01-01T00:00:00.000Z",
        "Culture fit": "2026-01-15T00:00:00.000Z",
      },
      currentStage: "Culture fit",
    });

    const stages = getDisplayStages(job);
    expect(stages).toContain("Culture fit");
    expect(stages).toContain("Accepted");
    expect(stages).toContain("Rejected");
  });

  it("rejects empty stage names", () => {
    expect(() => applyStageChange(sampleJob(), "   ")).toThrow(
      "Stage is required",
    );
  });
});

describe("JobRepository stage integration", () => {
  it("emits terminal stage listener when patching to Accepted", async () => {
    const { createJobRepository, InMemoryJobStore } = await import(
      "@backend/modules/job-repository/index.js"
    );
    const repository = createJobRepository(new InMemoryJobStore());
    const listener = vi.fn();
    repository.onTerminalStage(listener);

    const created = await repository.create("user-1", {
      title: "Engineer",
      company: "Acme",
      submissionDate: "2026-01-01",
    });

    const result = await repository.patch(created.userId, created.id, {
      stage: "Accepted",
    });

    expect(result.job.currentStage).toBe("Accepted");
    expect(listener).toHaveBeenCalledWith({
      jobId: created.id,
      userId: "user-1",
      stage: "Accepted",
    });
  });

  it("updates notes without changing stage", async () => {
    const { createJobRepository, InMemoryJobStore } = await import(
      "@backend/modules/job-repository/index.js"
    );
    const repository = createJobRepository(new InMemoryJobStore());

    const created = await repository.create("user-1", {
      title: "Engineer",
      company: "Acme",
      submissionDate: "2026-01-01",
    });

    const result = await repository.patch(created.userId, created.id, {
      notes: "Great team",
    });

    expect(result.job.notes).toBe("Great team");
    expect(result.job.currentStage).toBe(SUBMITTED_RESUME_STAGE);
    expect(result.terminalStageEvent).toBeUndefined();
  });
});
