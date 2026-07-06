import type { AgentChatMessage, CareerProfile } from "@jp/shared-types";
import type { AgentUseCaseDeps } from "./deps.js";
import { AgentUseCaseError } from "./errors.js";

export interface ProfileInterviewTurnInput {
  messages: AgentChatMessage[];
  completedTopics: string[];
  answer?: string;
}

export type ProfileInterviewTurnResult =
  | {
      complete: true;
      profile: CareerProfile;
      messages: AgentChatMessage[];
      completedTopics: string[];
    }
  | {
      complete: false;
      messages: AgentChatMessage[];
      completedTopics: string[];
    };

const COMPLETION_MESSAGE =
  "Your profile is saved. You can edit it anytime on the Profile page.";

export async function profileInterviewTurn(
  deps: Pick<AgentUseCaseDeps, "profileRepository" | "createProfileInterviewAgent">,
  userId: string,
  input: ProfileInterviewTurnInput,
): Promise<ProfileInterviewTurnResult> {
  const existing = await deps.profileRepository.get(userId);
  if (deps.profileRepository.isComplete(existing)) {
    throw new AgentUseCaseError("Profile interview already completed", 400);
  }

  const agent = deps.createProfileInterviewAgent();
  const messages = [...input.messages];
  let completedTopics = [...input.completedTopics];

  if (input.answer?.trim()) {
    messages.push({ role: "user", content: input.answer.trim() });
    completedTopics = await agent.updateCompletedTopics(messages, completedTopics);
  }

  if (agent.isInterviewComplete(completedTopics)) {
    const profile = await deps.profileRepository.saveInterviewProfile(
      userId,
      await agent.buildProfileFromTranscript(messages),
    );
    return {
      complete: true,
      profile,
      messages: [
        ...messages,
        { role: "assistant", content: COMPLETION_MESSAGE },
      ],
      completedTopics,
    };
  }

  const question = await agent.getNextQuestion(messages, completedTopics);
  return {
    complete: false,
    messages: [...messages, { role: "assistant", content: question }],
    completedTopics,
  };
}
