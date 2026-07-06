import type { AgentUseCaseDeps } from "./deps.js";
import {
  contentGenerationWorkflow,
  type ContentGenerationInput,
  type ContentGenerationResult,
} from "./content-generation.js";

export type AnnouncementInput = ContentGenerationInput;
export type AnnouncementResult = ContentGenerationResult;

export async function announcementWorkflow(
  deps: Pick<
    AgentUseCaseDeps,
    "jobRepository" | "profileRepository" | "createContentGenerationAgent"
  >,
  userId: string,
  jobId: string,
  input: AnnouncementInput,
): Promise<AnnouncementResult> {
  return contentGenerationWorkflow("announcement", deps, userId, jobId, input);
}
