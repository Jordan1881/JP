import type { AgentChatMessage, CareerProfile, Job } from "@jp/shared-types";
import type { ClaudeClient } from "../claude-api-client/index.js";
import { ProfileInterviewAgent } from "../profile-interview-agent/index.js";

function jobContext(job: Job): string {
  return [
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    job.description ? `Description: ${job.description}` : "",
    job.notes ? `Notes: ${job.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export class CoverLetterAgent {
  constructor(
    private readonly client: ClaudeClient,
    private readonly profileFormatter = new ProfileInterviewAgent(client),
  ) {}

  async generate(job: Job, profile: CareerProfile): Promise<string> {
    return this.client.complete({
      model: "claude-sonnet-4-20250514",
      system:
        "Write a tailored cover letter draft for the candidate. Keep it professional and specific to the job.",
      messages: [
        {
          role: "user",
          content: `${this.profileFormatter.formatProfileSummary(profile)}\n\n${jobContext(job)}`,
        },
      ],
    });
  }

  async revise(
    draft: string,
    instruction: string,
    messages: AgentChatMessage[] = [],
  ): Promise<string> {
    return this.client.complete({
      model: "claude-sonnet-4-20250514",
      system:
        "Revise the cover letter draft according to the user's instruction. Return only the updated letter.",
      messages: [
        ...messages,
        { role: "user", content: `Current draft:\n${draft}\n\nRevision: ${instruction}` },
      ],
    });
  }
}

export class JobAnnouncementAgent {
  constructor(
    private readonly client: ClaudeClient,
    private readonly profileFormatter = new ProfileInterviewAgent(client),
  ) {}

  async generate(job: Job, profile: CareerProfile): Promise<string> {
    return this.client.complete({
      model: "claude-sonnet-4-20250514",
      system:
        "Write a short social post announcing the candidate accepted a new job. Draft only, friendly tone.",
      messages: [
        {
          role: "user",
          content: `${this.profileFormatter.formatProfileSummary(profile)}\n\n${jobContext(job)}`,
        },
      ],
    });
  }

  async revise(
    draft: string,
    instruction: string,
    messages: AgentChatMessage[] = [],
  ): Promise<string> {
    return this.client.complete({
      model: "claude-sonnet-4-20250514",
      system:
        "Revise the announcement draft according to the user's instruction. Return only the updated draft.",
      messages: [
        ...messages,
        { role: "user", content: `Current draft:\n${draft}\n\nRevision: ${instruction}` },
      ],
    });
  }
}
