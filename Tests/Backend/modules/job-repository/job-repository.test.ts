import { describe, expect, it } from "vitest";
import { SUBMITTED_RESUME_STAGE } from "@backend/modules/stage-pipeline-manager/index.js";
import {
  createJobRepository,
  InMemoryJobStore,
} from "@backend/modules/job-repository/index.js";

describe("JobRepository", () => {
  it("creates a job with submission date as Submitted resume stage timestamp", async () => {
    const store = new InMemoryJobStore();
    const repository = createJobRepository(store);

    const job = await repository.create("user-1", {
      title: "Software Engineer",
      company: "Acme Corp",
      submissionDate: "2026-01-15",
    });

    expect(job.status).toBe("active");
    expect(job.currentStage).toBe(SUBMITTED_RESUME_STAGE);
    expect(job.stageHistory[SUBMITTED_RESUME_STAGE]).toBe(
      new Date("2026-01-15").toISOString(),
    );
    expect(job.submissionDate).toBe(job.stageHistory[SUBMITTED_RESUME_STAGE]);
  });

  it("persists optional fields and trims whitespace", async () => {
    const repository = createJobRepository(new InMemoryJobStore());

    const job = await repository.create("user-1", {
      title: "  Designer  ",
      company: " Pixel Co ",
      submissionDate: "2026-02-01",
      jobNumber: " 123 ",
      url: " https://example.com/job ",
      description: "Great role",
      notes: "Referral from Alex",
    });

    expect(job.title).toBe("Designer");
    expect(job.company).toBe("Pixel Co");
    expect(job.jobNumber).toBe("123");
    expect(job.url).toBe("https://example.com/job");
    expect(job.description).toBe("Great role");
    expect(job.notes).toBe("Referral from Alex");
  });

  it("lists only active jobs sorted by last updated descending", async () => {
    const store = new InMemoryJobStore();
    const repository = createJobRepository(store);

    const older = await repository.create("user-1", {
      title: "Older",
      company: "A",
      submissionDate: "2026-01-01",
    });

    const newer = await repository.create("user-1", {
      title: "Newer",
      company: "B",
      submissionDate: "2026-01-02",
    });

    await store.insert({
      ...older,
      status: "archived",
      archiveReason: "manual",
      archivedAt: new Date().toISOString(),
      lastUpdatedAt: "2026-01-01T00:00:00.000Z",
    });
    await store.insert({
      ...newer,
      lastUpdatedAt: "2026-01-02T00:00:00.000Z",
    });

    const jobs = await repository.listActive({ userId: "user-1" });

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.id).toBe(newer.id);
  });

  it("rejects missing required fields", async () => {
    const repository = createJobRepository(new InMemoryJobStore());

    await expect(
      repository.create("user-1", {
        title: "",
        company: "Acme",
        submissionDate: "2026-01-01",
      }),
    ).rejects.toThrow("Job title is required");
  });
});
