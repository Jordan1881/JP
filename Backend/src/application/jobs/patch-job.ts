import type { Job, PatchJobInput } from "@jp/shared-types";
import type { TerminalStageEvent } from "../../modules/stage-pipeline-manager/index.js";
import { applyTerminalStageArchive } from "../../modules/job-lifecycle-coordinator/index.js";
import type { JobRepositoryPort } from "./ports.js";

export type PatchJobResult = {
  job: Job;
  terminalStageEvent?: TerminalStageEvent;
};

export async function patchJob(
  userId: string,
  jobId: string,
  input: PatchJobInput,
  repository: JobRepositoryPort,
): Promise<PatchJobResult> {
  const result = await repository.patch(userId, jobId, input);
  if (!result.terminalStageEvent) {
    return result;
  }

  const archived = applyTerminalStageArchive(result.job, result.terminalStageEvent);
  const job = await repository.updateJob(userId, jobId, archived);
  return { job, terminalStageEvent: result.terminalStageEvent };
}
