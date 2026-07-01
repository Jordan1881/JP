import { describe, expect, it } from "vitest";
import { TERMINAL_STAGES, type Job } from "@jp/shared-types";
import { JOB_REPOSITORY_MODULE } from "@backend/modules/job-repository/index.js";

describe("Backend smoke", () => {
  it("registers job-repository module placeholder", () => {
    expect(JOB_REPOSITORY_MODULE).toBe("job-repository");
  });

  it("shared-types define terminal stages and job shape", () => {
    expect(TERMINAL_STAGES).toEqual(["Accepted", "Rejected"]);

    const job: Job = {
      id: "job-1",
      userId: "user-1",
      title: "Software Engineer",
      company: "Acme Corp",
      submissionDate: "2026-01-01T00:00:00.000Z",
      currentStage: "Submitted resume",
      stageHistory: { "Submitted resume": "2026-01-01T00:00:00.000Z" },
      status: "active",
      lastUpdatedAt: "2026-01-01T00:00:00.000Z",
    };

    expect(job.status).toBe("active");
  });
});
