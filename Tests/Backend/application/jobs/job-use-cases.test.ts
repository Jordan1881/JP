import { describe, expect, it, vi } from "vitest";
import type { JobImportResult } from "@jp/shared-types";
import {
  createJobRepository,
  InMemoryJobStore,
} from "@backend/modules/job-repository/index.js";
import {
  archiveJob,
  createJob,
  deleteJob,
  getJob,
  importJob,
  listJobs,
  patchJob,
  restoreJob,
  type JobImportAgentPort,
} from "@backend/application/jobs/index.js";

const USER = "user-1";

function repository() {
  return createJobRepository(new InMemoryJobStore());
}

function importAgent(fields: JobImportResult): JobImportAgentPort {
  return {
    importFromText: vi.fn().mockResolvedValue(fields),
    importFromUrl: vi.fn().mockResolvedValue(fields),
  };
}

describe("job use-cases", () => {
  it("lists jobs for a user", async () => {
    const repo = repository();
    await repo.create(USER, {
      title: "Engineer",
      company: "Acme",
      submissionDate: "2026-01-15",
    });

    const jobs = await listJobs(USER, { status: "active" }, repo);

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.title).toBe("Engineer");
  });

  it("imports from pasted text via the agent port", async () => {
    const agent = importAgent({
      title: "Designer",
      company: "Pixel Co",
      notes: "Imported from pasted text",
    });

    const fields = await importJob({ text: "Senior Designer at Pixel Co" }, agent);

    expect(agent.importFromText).toHaveBeenCalledWith("Senior Designer at Pixel Co");
    expect(agent.importFromUrl).not.toHaveBeenCalled();
    expect(fields.title).toBe("Designer");
  });

  it("imports from a URL via the agent port", async () => {
    const agent = importAgent({
      title: "PM",
      company: "Startup",
      url: "https://example.com/jobs/pm",
    });

    const fields = await importJob(
      { url: "https://example.com/jobs/pm" },
      agent,
    );

    expect(agent.importFromUrl).toHaveBeenCalledWith("https://example.com/jobs/pm");
    expect(fields.company).toBe("Startup");
  });

  it("rejects import when neither URL nor text is provided", async () => {
    const agent = importAgent({ title: "X", company: "Y" });

    await expect(importJob({}, agent)).rejects.toThrow(
      "A job URL or pasted text is required",
    );
  });

  it("creates a job", async () => {
    const repo = repository();

    const job = await createJob(
      USER,
      {
        title: "Backend Dev",
        company: "Cloud Inc",
        submissionDate: "2026-02-01",
      },
      repo,
    );

    expect(job.id).toBeTruthy();
    expect(job.status).toBe("active");
  });

  it("gets a job by id", async () => {
    const repo = repository();
    const created = await repo.create(USER, {
      title: "QA",
      company: "Test Co",
      submissionDate: "2026-01-01",
    });

    const found = await getJob(USER, created.id, repo);
    const missing = await getJob(USER, "missing-id", repo);

    expect(found?.id).toBe(created.id);
    expect(missing).toBeNull();
  });

  it("patches job notes", async () => {
    const repo = repository();
    const created = await repo.create(USER, {
      title: "Analyst",
      company: "Data Co",
      submissionDate: "2026-01-10",
    });

    const { job } = await patchJob(
      USER,
      created.id,
      { notes: "Follow up next week" },
      repo,
    );

    expect(job.notes).toBe("Follow up next week");
  });

  it("patches stage and archives on terminal stage", async () => {
    const repo = repository();
    const created = await repo.create(USER, {
      title: "Lead",
      company: "Big Co",
      submissionDate: "2026-01-05",
    });

    const { job, terminalStageEvent } = await patchJob(
      USER,
      created.id,
      { stage: "Rejected" },
      repo,
    );

    expect(terminalStageEvent?.stage).toBe("Rejected");
    expect(job.status).toBe("archived");
    expect(job.archiveReason).toBe("rejected");
  });

  it("archives manually by default", async () => {
    const repo = repository();
    const created = await repo.create(USER, {
      title: "Ops",
      company: "Ops Co",
      submissionDate: "2026-01-20",
    });

    const job = await archiveJob(USER, created.id, {}, repo);

    expect(job.status).toBe("archived");
    expect(job.archiveReason).toBe("manual");
  });

  it("archives with no_response reason", async () => {
    const repo = repository();
    const created = await repo.create(USER, {
      title: "Support",
      company: "Help Co",
      submissionDate: "2026-01-22",
    });

    const job = await archiveJob(
      USER,
      created.id,
      { reason: "no_response" },
      repo,
    );

    expect(job.status).toBe("archived");
    expect(job.archiveReason).toBe("no_response");
  });

  it("restores an archived job", async () => {
    const repo = repository();
    const created = await repo.create(USER, {
      title: "DevOps",
      company: "Infra Co",
      submissionDate: "2026-01-25",
    });
    await archiveJob(USER, created.id, {}, repo);

    const job = await restoreJob(USER, created.id, repo);

    expect(job.status).toBe("active");
    expect(job.archiveReason).toBeUndefined();
  });

  it("deletes a job permanently", async () => {
    const repo = repository();
    const created = await repo.create(USER, {
      title: "Temp",
      company: "Gone Co",
      submissionDate: "2026-01-30",
    });

    await deleteJob(USER, created.id, repo);

    expect(await getJob(USER, created.id, repo)).toBeNull();
  });
});
