import type { Job, PatchJobInput } from "@jp/shared-types";
import type { TerminalStageEvent } from "../../modules/stage-pipeline-manager/index.js";
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
  return repository.patch(userId, jobId, input);
}
