import type { Job } from "@jp/shared-types";
import type { JobRepositoryPort } from "./ports.js";

export type ArchiveJobInput = {
  reason?: "manual" | "no_response";
};

export async function archiveJob(
  userId: string,
  jobId: string,
  input: ArchiveJobInput,
  repository: JobRepositoryPort,
): Promise<Job> {
  if (input.reason === "no_response") {
    return repository.archiveNoResponse(userId, jobId);
  }
  return repository.archiveManual(userId, jobId);
}
