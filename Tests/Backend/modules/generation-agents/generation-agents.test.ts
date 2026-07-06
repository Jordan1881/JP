import { describe, expect, it } from "vitest";
import type { ClaudeClient } from "@backend/modules/claude-api-client/index.js";
import {
  CONTENT_KIND_PROFILES,
  ContentGenerationAgent,
  CoverLetterAgent,
  JobAnnouncementAgent,
} from "@backend/modules/generation-agents/index.js";

class StubClaudeClient implements ClaudeClient {
  lastInput: { system: string; messages: Array<{ role: string; content: string }> } | null =
    null;

  async complete(
    _tier: string,
    input: { system: string; messages: Array<{ role: string; content: string }> },
  ): Promise<string> {
    this.lastInput = input;
    return "Draft based on your input: profile data";
  }
}

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
    const client = new StubClaudeClient();
    const agent = new CoverLetterAgent(client);
    const draft = await agent.generate(job, profile);
    expect(draft).toContain("Draft based on your input");
    expect(client.lastInput?.system).toBe(
      CONTENT_KIND_PROFILES.cover_letter.generateSystem,
    );
  });

  it("generates announcement for accepted jobs", async () => {
    const client = new StubClaudeClient();
    const agent = new JobAnnouncementAgent(client);
    const draft = await agent.generate(job, profile);
    expect(draft.length).toBeGreaterThan(0);
    expect(client.lastInput?.system).toBe(
      CONTENT_KIND_PROFILES.announcement.generateSystem,
    );
  });

  it("uses content kind profiles via ContentGenerationAgent", async () => {
    const client = new StubClaudeClient();
    const agent = new ContentGenerationAgent(client, "cover_letter");
    await agent.revise("Old draft", "Make it shorter");
    expect(client.lastInput?.system).toBe(
      CONTENT_KIND_PROFILES.cover_letter.reviseSystem,
    );
  });
});
