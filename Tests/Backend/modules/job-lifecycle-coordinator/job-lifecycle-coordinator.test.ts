import { describe, expect, it } from "vitest";
import type { Job } from "@jp/shared-types";
import { SUBMITTED_RESUME_STAGE } from "@backend/modules/stage-pipeline-manager/index.js";
import { applyTerminalStageArchive } from "@backend/modules/job-lifecycle-coordinator/index.js";
import {
  createJobRepository,
  InMemoryJobStore,
} from "@backend/modules/job-repository/index.js";
import { patchJob } from "@backend/application/jobs/index.js";

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
    lastUpdatedAt: "2026-01-15T12:00:00.000Z",
    ...overrides,
  };
}

describe("JobLifecycleCoordinator", () => {
  it("archives Accepted with accepted reason via archive lifecycle rules", () => {
    const job = sampleJob({ currentStage: "Accepted" });
    const archived = applyTerminalStageArchive(job, {
      jobId: job.id,
      userId: job.userId,
      stage: "Accepted",
    });

    expect(archived.status).toBe("archived");
    expect(archived.archiveReason).toBe("accepted");
    expect(archived.archivedAt).toBe(job.lastUpdatedAt);
  });

  it("archives Rejected with rejected reason via archive lifecycle rules", () => {
    const job = sampleJob({ currentStage: "Rejected" });
    const archived = applyTerminalStageArchive(job, {
      jobId: job.id,
      userId: job.userId,
      stage: "Rejected",
    });

    expect(archived.status).toBe("archived");
    expect(archived.archiveReason).toBe("rejected");
  });
});

describe("stage to archive orchestration", () => {
  it("patchJob coordinates terminal stage with archive without HTTP", async () => {
    const repository = createJobRepository(new InMemoryJobStore());
    const created = await repository.create("user-1", {
      title: "Engineer",
      company: "Acme",
      submissionDate: "2026-01-01",
    });

    const { job, terminalStageEvent } = await patchJob(
      created.userId,
      created.id,
      { stage: "Accepted" },
      repository,
    );

    expect(terminalStageEvent).toEqual({
      jobId: created.id,
      userId: "user-1",
      stage: "Accepted",
    });
    expect(job.currentStage).toBe("Accepted");
    expect(job.status).toBe("archived");
    expect(job.archiveReason).toBe("accepted");

    const persisted = await repository.getById("user-1", created.id);
    expect(persisted?.status).toBe("archived");
    expect(persisted?.archiveReason).toBe("accepted");
  });

  it("repository patch alone does not auto-archive terminal stages", async () => {
    const repository = createJobRepository(new InMemoryJobStore());
    const created = await repository.create("user-1", {
      title: "Engineer",
      company: "Acme",
      submissionDate: "2026-01-01",
    });

    const { job, terminalStageEvent } = await repository.patch(
      created.userId,
      created.id,
      { stage: "Rejected" },
    );

    expect(terminalStageEvent?.stage).toBe("Rejected");
    expect(job.status).toBe("active");
    expect(job.currentStage).toBe("Rejected");
  });
});
