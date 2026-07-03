import type { AgentChatMessage, CareerProfile, UpdateProfileInput } from "@jp/shared-types";
import type { ClaudeClient } from "../claude-api-client/index.js";
import { parseStructuredOutput } from "../claude-api-client/index.js";

export const PROFILE_TOPICS = [
  "tech stack",
  "target roles and seniority",
  "years of experience",
  "location and remote preference",
  "salary expectations",
  "notable projects",
  "soft skills and working style",
  "career narrative",
] as const;

export type ProfileTopic = (typeof PROFILE_TOPICS)[number];

const TOPIC_ASSESSMENT_SYSTEM = `You assess profile interview progress.
Required topics (all must be substantively covered before the interview ends):
${PROFILE_TOPICS.map((topic, index) => `${index + 1}. ${topic}`).join("\n")}

Rules:
- Return JSON only: {"completedTopics":["..."]}
- Include a topic only when the candidate gave substantive, specific answers in the transcript
- Adapt to role: e.g. for a designer, accept UI/visual stack answers for "tech stack" without requiring backend technologies
- Do not mark topics complete based on answer length alone
- Topic names in completedTopics must match the required list exactly`;

const NEXT_QUESTION_SYSTEM = `You are JP's one-time profile interview agent.
Ask one concise, conversational follow-up question about the highest-priority uncovered topic.
Adapt follow-ups to the candidate's role (skip irrelevant branches — e.g. no deep backend questions for a designer).
Do not repeat questions on topics already substantively covered.
Return only the question text, no preamble.`;

const SAVE_PROFILE_SYSTEM = `You extract structured career profile data from a completed profile interview (save_profile_data).
Return JSON only with these fields:
{
  "techStack": string[],
  "targetRoles": string[],
  "seniority": string,
  "yearsOfExperience": number,
  "locationPreference": string,
  "remotePreference": string,
  "salaryExpectations": string,
  "notableProjects": string,
  "softSkills": string,
  "careerNarrative": string
}
Use only information explicitly stated in the transcript. Never use placeholder or generic values.`;

type TopicAssessment = { completedTopics: string[] };

function normalizeTopics(topics: string[]): string[] {
  const allowed = new Set<string>(PROFILE_TOPICS);
  return [...new Set(topics.filter((topic) => allowed.has(topic)))];
}

function remainingTopics(completedTopics: string[]): ProfileTopic[] {
  const done = new Set(completedTopics);
  return PROFILE_TOPICS.filter((topic) => !done.has(topic));
}

export class ProfileInterviewAgent {
  constructor(private readonly client: ClaudeClient) {}

  getTopics(): readonly string[] {
    return PROFILE_TOPICS;
  }

  async updateCompletedTopics(
    messages: AgentChatMessage[],
    completedTopics: string[],
  ): Promise<string[]> {
    const raw = await this.client.complete("interview", {
      system: TOPIC_ASSESSMENT_SYSTEM,
      messages: [
        ...messages,
        {
          role: "user",
          content: `Current completed topics: ${completedTopics.join(", ") || "none"}. Return updated completedTopics JSON.`,
        },
      ],
    });
    const { completedTopics: assessed } =
      parseStructuredOutput<TopicAssessment>(raw);
    return normalizeTopics(assessed);
  }

  async getNextQuestion(
    messages: AgentChatMessage[],
    completedTopics: string[],
  ): Promise<string> {
    const remaining = remainingTopics(completedTopics);
    const system = `${NEXT_QUESTION_SYSTEM}

Topics already covered: ${completedTopics.join(", ") || "none"}
Topics still needed: ${remaining.join(", ") || "none"}`;

    return this.client.complete("interview", {
      system,
      messages:
        messages.length > 0
          ? messages
          : [{ role: "user", content: "Start the profile interview." }],
    });
  }

  async buildProfileFromTranscript(
    messages: AgentChatMessage[],
  ): Promise<UpdateProfileInput> {
    const raw = await this.client.complete("interview", {
      system: SAVE_PROFILE_SYSTEM,
      messages: [
        ...messages,
        {
          role: "user",
          content:
            "save_profile_data: extract the structured profile from this interview.",
        },
      ],
    });
    return parseStructuredOutput<UpdateProfileInput>(raw);
  }

  isInterviewComplete(completedTopics: string[]): boolean {
    return PROFILE_TOPICS.every((topic) => completedTopics.includes(topic));
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
