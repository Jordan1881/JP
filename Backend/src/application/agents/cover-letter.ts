import type { AgentUseCaseDeps } from "./deps.js";
import {
  contentGenerationWorkflow,
  type ContentGenerationInput,
  type ContentGenerationResult,
} from "./content-generation.js";

export type CoverLetterInput = ContentGenerationInput;
export type CoverLetterResult = ContentGenerationResult;

export async function coverLetterWorkflow(
  deps: Pick<
    AgentUseCaseDeps,
    "jobRepository" | "profileRepository" | "createContentGenerationAgent"
  >,
  userId: string,
  jobId: string,
  input: CoverLetterInput,
): Promise<CoverLetterResult> {
  return contentGenerationWorkflow("cover_letter", deps, userId, jobId, input);
}
