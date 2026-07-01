import type { AgentChatMessage, CareerProfile, UpdateProfileInput } from "@jp/shared-types";
import type { ClaudeClient } from "../claude-api-client/index.js";

const PROFILE_TOPICS = [
  "tech stack",
  "target roles and seniority",
  "years of experience",
  "location and remote preference",
  "salary expectations",
  "notable projects",
  "soft skills and working style",
  "career narrative",
] as const;

export class ProfileInterviewAgent {
  constructor(private readonly client: ClaudeClient) {}

  getTopics(): readonly string[] {
    return PROFILE_TOPICS;
  }

  async getNextQuestion(
    messages: AgentChatMessage[],
    completedTopics: string[],
  ): Promise<string> {
    if (completedTopics.length >= PROFILE_TOPICS.length) {
      return "Thanks — your profile is ready to save.";
    }

    const nextTopic = PROFILE_TOPICS[completedTopics.length];
    const system = `You are JP's one-time profile interview agent. Ask one concise question about: ${nextTopic}. Do not repeat completed topics: ${completedTopics.join(", ") || "none"}.`;

    return this.client.complete({
      model: "claude-sonnet-4-20250514",
      system,
      messages:
        messages.length > 0
          ? messages
          : [{ role: "user", content: "Start the profile interview." }],
    });
  }

  inferCompletedTopics(answer: string, completedTopics: string[]): string[] {
    const next = PROFILE_TOPICS[completedTopics.length];
    if (!next) {
      return completedTopics;
    }
    if (answer.trim().length < 2) {
      return completedTopics;
    }
    return [...completedTopics, next];
  }

  buildProfileFromTranscript(
    messages: AgentChatMessage[],
  ): UpdateProfileInput {
    const userAnswers = messages
      .filter((message) => message.role === "user")
      .map((message) => message.content);
    const joined = userAnswers.join("\n");
    return {
      techStack: joined.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 8),
      targetRoles: ["Software Engineer"],
      seniority: "Mid",
      yearsOfExperience: 3,
      locationPreference: joined.includes("remote") ? "Remote-friendly" : "Flexible",
      remotePreference: joined.includes("remote") ? "Remote" : "Hybrid",
      salaryExpectations: "Discussed in interview",
      notableProjects: userAnswers.at(-3) ?? "",
      softSkills: userAnswers.at(-2) ?? "",
      careerNarrative: userAnswers.at(-1) ?? joined,
    };
  }

  isInterviewComplete(completedTopics: string[]): boolean {
    return completedTopics.length >= PROFILE_TOPICS.length;
  }

  formatProfileSummary(profile: CareerProfile): string {
    return [
      `Tech stack: ${profile.techStack.join(", ")}`,
      `Target roles: ${profile.targetRoles.join(", ")}`,
      `Seniority: ${profile.seniority}`,
      `Experience: ${profile.yearsOfExperience} years`,
      `Location: ${profile.locationPreference}`,
      `Remote: ${profile.remotePreference}`,
      `Salary: ${profile.salaryExpectations}`,
      `Projects: ${profile.notableProjects}`,
      `Soft skills: ${profile.softSkills}`,
      `Narrative: ${profile.careerNarrative}`,
    ].join("\n");
  }
}
