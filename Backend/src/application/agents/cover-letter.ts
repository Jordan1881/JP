import type { AgentChatMessage, Job } from "@jp/shared-types";
import type { AgentUseCaseDeps } from "./deps.js";
import { AgentUseCaseError } from "./errors.js";
import { requireCompleteProfile } from "./gates.js";

export interface CoverLetterInput {
  action: "generate" | "revise";
  instruction?: string;
  messages?: AgentChatMessage[];
}

export interface CoverLetterResult {
  job: Job;
  draft: string;
}

export async function coverLetterWorkflow(
  deps: Pick<
    AgentUseCaseDeps,
    "jobRepository" | "profileRepository" | "createCoverLetterAgent"
  >,
  userId: string,
  jobId: string,
  input: CoverLetterInput,
): Promise<CoverLetterResult> {
  const job = await deps.jobRepository.getById(userId, jobId);
  if (!job) {
    throw new AgentUseCaseError("Job not found", 404);
  }

  const profile = await requireCompleteProfile(deps.profileRepository, userId);
  const agent = deps.createCoverLetterAgent();

  const draft =
    input.action === "revise" && job.coverLetter && input.instruction
      ? await agent.revise(
          job.coverLetter,
          input.instruction,
          input.messages ?? [],
        )
      : await agent.generate(job, profile);

  const updated = await deps.jobRepository.patch(userId, jobId, {
    coverLetter: draft,
  });
  return { job: updated.job, draft };
}
