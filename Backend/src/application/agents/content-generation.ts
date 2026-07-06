import type { AgentChatMessage, Job, PatchJobInput } from "@jp/shared-types";
import type { ContentKind } from "../../modules/generation-agents/index.js";
import type { AgentUseCaseDeps } from "./deps.js";
import { AgentUseCaseError } from "./errors.js";
import { requireCompleteProfile } from "./gates.js";

export type ContentWorkflowKind = ContentKind;

export interface ContentGenerationInput {
  action: "generate" | "revise";
  instruction?: string;
  messages?: AgentChatMessage[];
}

export interface ContentGenerationResult {
  job: Job;
  draft: string;
}

interface ContentWorkflowConfig {
  kind: ContentKind;
  getDraft: (job: Job) => string | undefined;
  patchField: (draft: string) => Pick<PatchJobInput, "coverLetter" | "announcement">;
  validateJob?: (job: Job) => void;
}

const CONTENT_WORKFLOW_CONFIG: Record<ContentWorkflowKind, ContentWorkflowConfig> =
  {
    cover_letter: {
      kind: "cover_letter",
      getDraft: (job) => job.coverLetter,
      patchField: (draft) => ({ coverLetter: draft }),
    },
    announcement: {
      kind: "announcement",
      getDraft: (job) => job.announcement,
      patchField: (draft) => ({ announcement: draft }),
      validateJob: (job) => {
        if (job.currentStage !== "Accepted") {
          throw new AgentUseCaseError(
            "Announcement is only available for Accepted jobs",
            400,
          );
        }
      },
    },
  };

export async function contentGenerationWorkflow(
  kind: ContentWorkflowKind,
  deps: Pick<
    AgentUseCaseDeps,
    "jobRepository" | "profileRepository" | "createContentGenerationAgent"
  >,
  userId: string,
  jobId: string,
  input: ContentGenerationInput,
): Promise<ContentGenerationResult> {
  const config = CONTENT_WORKFLOW_CONFIG[kind];
  const job = await deps.jobRepository.getById(userId, jobId);
  if (!job) {
    throw new AgentUseCaseError("Job not found", 404);
  }

  config.validateJob?.(job);

  const profile = await requireCompleteProfile(deps.profileRepository, userId);
  const agent = deps.createContentGenerationAgent(config.kind);

  const existingDraft = config.getDraft(job);
  const draft =
    input.action === "revise" && existingDraft && input.instruction
      ? await agent.revise(existingDraft, input.instruction, input.messages ?? [])
      : await agent.generate(job, profile);

  const updated = await deps.jobRepository.patch(userId, jobId, config.patchField(draft));
  return { job: updated.job, draft };
}
