import { beforeEach, describe, expect, it } from "vitest";
import type { ClaudeClient } from "@backend/modules/claude-api-client/index.js";
import {
  MockClaudeClient,
  type ClaudeAgentTier,
  type ClaudeCompletionInput,
} from "@backend/modules/claude-api-client/index.js";
import {
  ContentGenerationAgent,
} from "@backend/modules/generation-agents/index.js";
import { JobRepository, InMemoryJobStore } from "@backend/modules/job-repository/index.js";
import {
  ProfileRepository,
  InMemoryProfileStore,
} from "@backend/modules/profile-repository/index.js";
import {
  PROFILE_TOPICS,
  ProfileInterviewAgent,
} from "@backend/modules/profile-interview-agent/index.js";
import {
  AgentUseCaseError,
  announcementWorkflow,
  coverLetterWorkflow,
  profileInterviewTurn,
  type AgentUseCaseDeps,
} from "@backend/application/agents/index.js";

const EXTRACTED_PROFILE = {
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
};

class StubGenerationClient implements ClaudeClient {
  async complete(): Promise<string> {
    return "Generated draft";
  }
}

function createInterviewMock() {
  return new MockClaudeClient(
    (tier: ClaudeAgentTier, input: ClaudeCompletionInput) => {
      expect(tier).toBe("interview");

      if (input.system.includes("assess profile interview progress")) {
        const count = input.messages.filter(
          (message) =>
            message.role === "user" &&
            !message.content.startsWith("Current completed topics:"),
        ).length;
        return JSON.stringify({
          completedTopics: PROFILE_TOPICS.slice(0, Math.min(count, PROFILE_TOPICS.length)),
        });
      }

      if (input.system.includes("save_profile_data")) {
        return JSON.stringify(EXTRACTED_PROFILE);
      }

      return "What is your target role?";
    },
  );
}

function createDeps(
  client: ClaudeClient = new StubGenerationClient(),
): AgentUseCaseDeps {
  const jobRepository = new JobRepository(new InMemoryJobStore());
  const profileRepository = new ProfileRepository(new InMemoryProfileStore());

  return {
    jobRepository,
    profileRepository,
    createContentGenerationAgent: (kind) => new ContentGenerationAgent(client, kind),
    createProfileInterviewAgent: () => new ProfileInterviewAgent(client),
  };
}

async function seedCompleteProfile(
  deps: AgentUseCaseDeps,
  userId: string,
): Promise<void> {
  await deps.profileRepository.saveInterviewProfile(userId, EXTRACTED_PROFILE);
}

async function seedJob(deps: AgentUseCaseDeps, userId: string) {
  return deps.jobRepository.create(userId, {
    title: "Engineer",
    company: "Acme",
    submissionDate: "2026-01-01",
  });
}

async function seedAcceptedJob(deps: AgentUseCaseDeps, userId: string) {
  const job = await seedJob(deps, userId);
  const updated = await deps.jobRepository.patch(userId, job.id, {
    stage: "Accepted",
  });
  return updated.job;
}

describe("agent use-cases", () => {
  let deps: AgentUseCaseDeps;

  beforeEach(() => {
    deps = createDeps();
  });

  describe("profileInterviewTurn", () => {
    it("rejects when the profile interview is already complete", async () => {
      await seedCompleteProfile(deps, "user-1");

      await expect(
        profileInterviewTurn(deps, "user-1", {
          messages: [],
          completedTopics: [],
        }),
      ).rejects.toMatchObject({
        message: "Profile interview already completed",
        statusCode: 400,
      } satisfies Partial<AgentUseCaseError>);
    });

    it("returns the next question when topics remain", async () => {
      deps = createDeps(createInterviewMock());

      const result = await profileInterviewTurn(deps, "user-1", {
        messages: [],
        completedTopics: [],
      });

      expect(result.complete).toBe(false);
      if (!result.complete) {
        expect(result.messages.at(-1)).toEqual({
          role: "assistant",
          content: "What is your target role?",
        });
      }
    });

    it("saves the profile when all topics are covered", async () => {
      const interviewClient = createInterviewMock();
      deps = createDeps(interviewClient);

      let completedTopics: string[] = [];
      let messages: Array<{ role: "user" | "assistant"; content: string }> = [];

      for (let turn = 0; turn < PROFILE_TOPICS.length; turn += 1) {
        const result = await profileInterviewTurn(deps, "user-1", {
          messages,
          completedTopics,
          answer: `Answer ${turn + 1}`,
        });

        if (result.complete) {
          expect(result.profile?.interviewCompletedAt).toBeTruthy();
          expect(await deps.profileRepository.get("user-1")).toEqual(
            result.profile,
          );
          return;
        }

        messages = result.messages;
        completedTopics = result.completedTopics;
      }

      throw new Error("Expected interview to complete");
    });
  });

  describe("coverLetterWorkflow", () => {
    it("requires a complete profile", async () => {
      const job = await seedJob(deps, "user-1");

      await expect(
        coverLetterWorkflow(deps, "user-1", job.id, { action: "generate" }),
      ).rejects.toMatchObject({
        message: "Complete your profile interview before generating content",
        statusCode: 400,
      });
    });

    it("returns 404 when the job is missing", async () => {
      await seedCompleteProfile(deps, "user-1");

      await expect(
        coverLetterWorkflow(deps, "user-1", "missing-job", {
          action: "generate",
        }),
      ).rejects.toMatchObject({
        message: "Job not found",
        statusCode: 404,
      });
    });

    it("generates and persists a cover letter draft", async () => {
      await seedCompleteProfile(deps, "user-1");
      const job = await seedJob(deps, "user-1");

      const result = await coverLetterWorkflow(deps, "user-1", job.id, {
        action: "generate",
      });

      expect(result.draft).toBe("Generated draft");
      expect(result.job.coverLetter).toBe("Generated draft");
    });
  });

  describe("announcementWorkflow", () => {
    it("requires a complete profile", async () => {
      const job = await seedAcceptedJob(deps, "user-1");

      await expect(
        announcementWorkflow(deps, "user-1", job.id, { action: "generate" }),
      ).rejects.toMatchObject({
        message: "Complete your profile interview before generating content",
        statusCode: 400,
      });
    });

    it("requires the Accepted stage", async () => {
      await seedCompleteProfile(deps, "user-1");
      const job = await seedJob(deps, "user-1");

      await expect(
        announcementWorkflow(deps, "user-1", job.id, { action: "generate" }),
      ).rejects.toMatchObject({
        message: "Announcement is only available for Accepted jobs",
        statusCode: 400,
      });
    });

    it("generates and persists an announcement draft", async () => {
      await seedCompleteProfile(deps, "user-1");
      const job = await seedAcceptedJob(deps, "user-1");

      const result = await announcementWorkflow(deps, "user-1", job.id, {
        action: "generate",
      });

      expect(result.draft).toBe("Generated draft");
      expect(result.job.announcement).toBe("Generated draft");
    });
  });
});
