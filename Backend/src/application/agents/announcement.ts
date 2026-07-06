import type { AgentChatMessage, Job } from "@jp/shared-types";
import type { AgentUseCaseDeps } from "./deps.js";
import { AgentUseCaseError } from "./errors.js";
import { requireCompleteProfile } from "./gates.js";

export interface AnnouncementInput {
  action: "generate" | "revise";
  instruction?: string;
  messages?: AgentChatMessage[];
}

export interface AnnouncementResult {
  job: Job;
  draft: string;
}

export async function announcementWorkflow(
  deps: Pick<
    AgentUseCaseDeps,
    "jobRepository" | "profileRepository" | "createAnnouncementAgent"
  >,
  userId: string,
  jobId: string,
  input: AnnouncementInput,
): Promise<AnnouncementResult> {
  const job = await deps.jobRepository.getById(userId, jobId);
  if (!job) {
    throw new AgentUseCaseError("Job not found", 404);
  }
  if (job.currentStage !== "Accepted") {
    throw new AgentUseCaseError(
      "Announcement is only available for Accepted jobs",
      400,
    );
  }

  const profile = await requireCompleteProfile(deps.profileRepository, userId);
  const agent = deps.createAnnouncementAgent();

  const draft =
    input.action === "revise" && job.announcement && input.instruction
      ? await agent.revise(
          job.announcement,
          input.instruction,
          input.messages ?? [],
        )
      : await agent.generate(job, profile);

  const updated = await deps.jobRepository.patch(userId, jobId, {
    announcement: draft,
  });
  return { job: updated.job, draft };
}
