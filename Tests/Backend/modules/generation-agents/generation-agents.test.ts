import { describe, expect, it } from "vitest";
import { MockClaudeClient } from "@backend/modules/claude-api-client/index.js";
import {
  CoverLetterAgent,
  JobAnnouncementAgent,
} from "@backend/modules/generation-agents/index.js";

const profile = {
  userId: "u1",
  techStack: ["TypeScript"],
  targetRoles: ["Engineer"],
  seniority: "Mid",
  yearsOfExperience: 3,
  locationPreference: "Remote",
  remotePreference: "Remote",
  salaryExpectations: "100k",
  notableProjects: "JP",
  softSkills: "Communication",
  careerNarrative: "Builder",
  interviewCompletedAt: "2026-01-01T00:00:00.000Z",
};

const job = {
  id: "j1",
  userId: "u1",
  title: "Engineer",
  company: "Acme",
  submissionDate: "2026-01-01T00:00:00.000Z",
  currentStage: "Accepted",
  stageHistory: {},
  status: "active" as const,
  lastUpdatedAt: "2026-01-01T00:00:00.000Z",
};

describe("Generation agents", () => {
  it("generates cover letter with mocked Claude client", async () => {
    const agent = new CoverLetterAgent(new MockClaudeClient());
    const draft = await agent.generate(job, profile);
    expect(draft).toContain("Draft based on your input");
  });

  it("generates announcement for accepted jobs", async () => {
    const agent = new JobAnnouncementAgent(new MockClaudeClient());
    const draft = await agent.generate(job, profile);
    expect(draft.length).toBeGreaterThan(0);
  });
});
