import { describe, expect, it } from "vitest";
import type { Job } from "@jp/shared-types";
import { searchAndFilterJobs } from "@backend/modules/search-filter-engine/index.js";

const jobs: Job[] = [
  {
    id: "1",
    userId: "u1",
    title: "Frontend Engineer",
    company: "Acme",
    jobNumber: "FE-100",
    submissionDate: "2026-01-01T00:00:00.000Z",
    currentStage: "Phone screen",
    stageHistory: {},
    status: "active",
    lastUpdatedAt: "2026-01-10T00:00:00.000Z",
  },
  {
    id: "2",
    userId: "u1",
    title: "Backend Engineer",
    company: "Beta",
    submissionDate: "2026-01-01T00:00:00.000Z",
    currentStage: "Offer",
    stageHistory: {},
    status: "active",
    lastUpdatedAt: "2026-01-05T00:00:00.000Z",
  },
];

describe("searchAndFilterJobs", () => {
  it("filters by partial company/title/job number", () => {
    const result = searchAndFilterJobs(jobs, { q: "acme", status: "active" });
    expect(result).toHaveLength(1);
    expect(result[0]?.company).toBe("Acme");
  });

  it("filters by stage and sorts by last updated desc", () => {
    const result = searchAndFilterJobs(jobs, {
      stage: "Offer",
      status: "active",
      sortOrder: "desc",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Backend Engineer");
  });
});
