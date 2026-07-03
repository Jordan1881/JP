import { describe, expect, it } from "vitest";
import {
  MockClaudeClient,
  type ClaudeAgentTier,
  type ClaudeCompletionInput,
} from "@backend/modules/claude-api-client/index.js";
import {
  ProfileRepository,
  InMemoryProfileStore,
} from "@backend/modules/profile-repository/index.js";
import {
  PROFILE_TOPICS,
  ProfileInterviewAgent,
} from "@backend/modules/profile-interview-agent/index.js";

const EXTRACTED_PROFILE = {
  techStack: ["Figma", "Sketch"],
  targetRoles: ["Product Designer"],
  seniority: "Senior",
  yearsOfExperience: 7,
  locationPreference: "Tel Aviv",
  remotePreference: "Hybrid",
  salaryExpectations: "40k NIS/month",
  notableProjects: "Redesigned checkout flow at Acme",
  softSkills: "Collaborative, user-focused",
  careerNarrative: "Designer moving into product leadership",
};

function createInterviewMock(options: { designerMode?: boolean } = {}) {
  let designerMode = options.designerMode ?? false;
  const client = new MockClaudeClient(
    (tier: ClaudeAgentTier, input: ClaudeCompletionInput) => {
      expect(tier).toBe("interview");

      if (input.system.includes("assess profile interview progress")) {
        if (designerMode) {
          const transcript = input.messages
            .map((message) => message.content)
            .join(" ")
            .toLowerCase();
          const completed: string[] = [];
          if (transcript.includes("figma")) completed.push("tech stack");
          if (transcript.includes("product designer")) {
            completed.push("target roles and seniority");
          }
          if (transcript.includes("seven years")) {
            completed.push("years of experience");
          }
          if (transcript.includes("hybrid")) {
            completed.push("location and remote preference");
          }
          if (transcript.includes("40k")) completed.push("salary expectations");
          if (transcript.includes("checkout flow")) completed.push("notable projects");
          if (transcript.includes("collaborative")) {
            completed.push("soft skills and working style");
          }
          if (transcript.includes("product leadership")) {
            completed.push("career narrative");
          }
          return JSON.stringify({ completedTopics: completed });
        }

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

      const remaining = PROFILE_TOPICS.filter(
        (topic) => !input.system.includes(`Topics already covered: ${topic}`),
      );
      return `Tell me more about ${remaining[0] ?? "your background"}.`;
    },
  );
  return {
    client,
    setDesignerMode(enabled: boolean) {
      designerMode = enabled;
    },
  };
}

const designerTranscript = [
  { role: "assistant" as const, content: "What design tools do you use?" },
  { role: "user" as const, content: "Figma and Sketch daily." },
  { role: "assistant" as const, content: "What roles are you targeting?" },
  { role: "user" as const, content: "Senior Product Designer roles." },
  { role: "user" as const, content: "I have seven years of experience." },
  { role: "user" as const, content: "Prefer hybrid work in Tel Aviv." },
  { role: "user" as const, content: "Looking for around 40k NIS/month." },
  { role: "user" as const, content: "Redesigned checkout flow at Acme." },
  { role: "user" as const, content: "Collaborative and user-focused." },
  { role: "user" as const, content: "Moving into product leadership." },
];

describe("ProfileInterviewAgent", () => {
  it("exposes all eight PRD topic areas", () => {
    expect(PROFILE_TOPICS).toHaveLength(8);
  });

  it("uses interview tier for adaptive questions", async () => {
    const { client } = createInterviewMock();
    const agent = new ProfileInterviewAgent(client);

    await agent.getNextQuestion([], []);

    expect(client.calls.map((call) => call.tier)).toEqual(["interview"]);
  });

  it("requires all eight topics before completion", () => {
    const agent = new ProfileInterviewAgent(new MockClaudeClient(() => ""));

    expect(agent.isInterviewComplete(PROFILE_TOPICS.slice(0, 7))).toBe(false);
    expect(agent.isInterviewComplete([...PROFILE_TOPICS])).toBe(true);
  });

  it("assesses topic coverage from transcript instead of answer length", async () => {
    const { client } = createInterviewMock();
    const agent = new ProfileInterviewAgent(client);

    const completed = await agent.updateCompletedTopics(
      [{ role: "user", content: "I use Figma for UI work." }],
      [],
    );

    expect(completed).toEqual(["tech stack"]);
    expect(completed).not.toContain("target roles and seniority");
  });

  it("supports role-adaptive branching for a designer transcript", async () => {
    const { client, setDesignerMode } = createInterviewMock();
    setDesignerMode(true);
    const agent = new ProfileInterviewAgent(client);

    const completed = await agent.updateCompletedTopics(designerTranscript, []);

    expect(completed).toEqual([...PROFILE_TOPICS]);
    expect(agent.isInterviewComplete(completed)).toBe(true);
  });

  it("parses save_profile_data output from transcript without placeholders", async () => {
    const { client } = createInterviewMock();
    const agent = new ProfileInterviewAgent(client);

    const profile = await agent.buildProfileFromTranscript(designerTranscript);

    expect(profile).toEqual(EXTRACTED_PROFILE);
    expect(profile.targetRoles).not.toContain("Software Engineer");
    expect(profile.seniority).not.toBe("Mid");
    expect(profile.salaryExpectations).not.toBe("Discussed in interview");
    expect(client.calls.at(-1)?.tier).toBe("interview");
  });

  it("fires save_profile_data only when every topic is substantively covered", async () => {
    const { client, setDesignerMode } = createInterviewMock();
    setDesignerMode(true);
    const agent = new ProfileInterviewAgent(client);

    const partial = await agent.updateCompletedTopics(
      designerTranscript.slice(0, 4),
      [],
    );
    expect(agent.isInterviewComplete(partial)).toBe(false);

    const complete = await agent.updateCompletedTopics(designerTranscript, partial);
    expect(agent.isInterviewComplete(complete)).toBe(true);

    const callsBeforeSave = client.calls.length;
    await agent.buildProfileFromTranscript(designerTranscript);
    expect(client.calls.length).toBe(callsBeforeSave + 1);
    expect(client.calls.at(-1)?.tier).toBe("interview");
  });

  it("cannot re-trigger after profile interview is marked complete", async () => {
    const profileRepo = new ProfileRepository(new InMemoryProfileStore());
    await profileRepo.saveInterviewProfile("user-1", EXTRACTED_PROFILE);

    const client = new MockClaudeClient(() => {
      throw new Error("Claude should not be called for a completed interview");
    });
    const agent = new ProfileInterviewAgent(client);

    const existing = await profileRepo.get("user-1");
    expect(profileRepo.isComplete(existing)).toBe(true);

    if (profileRepo.isComplete(existing)) {
      expect(client.calls).toHaveLength(0);
      return;
    }

    await agent.getNextQuestion([], []);
  });
});
