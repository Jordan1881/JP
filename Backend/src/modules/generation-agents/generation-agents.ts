import type { AgentChatMessage, CareerProfile, Job } from "@jp/shared-types";
import type { ClaudeClient } from "../claude-api-client/index.js";
import { ProfileInterviewAgent } from "../profile-interview-agent/index.js";

export type ContentKind = "cover_letter" | "announcement";

export interface ContentKindProfile {
  generateSystem: string;
  reviseSystem: string;
}

export const CONTENT_KIND_PROFILES: Record<ContentKind, ContentKindProfile> = {
  cover_letter: {
    generateSystem:
      "Write a tailored cover letter draft for the candidate. Keep it professional and specific to the job.",
    reviseSystem:
      "Revise the cover letter draft according to the user's instruction. Return only the updated letter.",
  },
  announcement: {
    generateSystem:
      "Write a short social post announcing the candidate accepted a new job. Draft only, friendly tone.",
    reviseSystem:
      "Revise the announcement draft according to the user's instruction. Return only the updated draft.",
  },
};

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

export class ContentGenerationAgent {
  constructor(
    private readonly client: ClaudeClient,
    private readonly kind: ContentKind,
    private readonly profileFormatter = new ProfileInterviewAgent(client),
  ) {}

  private get prompts(): ContentKindProfile {
    return CONTENT_KIND_PROFILES[this.kind];
  }

  async generate(job: Job, profile: CareerProfile): Promise<string> {
    return this.client.complete("generation", {
      system: this.prompts.generateSystem,
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
    return this.client.complete("generation", {
      system: this.prompts.reviseSystem,
      messages: [
        ...messages,
        { role: "user", content: `Current draft:\n${draft}\n\nRevision: ${instruction}` },
      ],
    });
  }
}

/** @deprecated Use ContentGenerationAgent with kind "cover_letter" */
export class CoverLetterAgent extends ContentGenerationAgent {
  constructor(
    client: ClaudeClient,
    profileFormatter = new ProfileInterviewAgent(client),
  ) {
    super(client, "cover_letter", profileFormatter);
  }
}

/** @deprecated Use ContentGenerationAgent with kind "announcement" */
export class JobAnnouncementAgent extends ContentGenerationAgent {
  constructor(
    client: ClaudeClient,
    profileFormatter = new ProfileInterviewAgent(client),
  ) {
    super(client, "announcement", profileFormatter);
  }
}
