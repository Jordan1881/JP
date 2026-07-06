import type { Job } from "@jp/shared-types";
import type { JobRepositoryPort } from "./ports.js";

export async function restoreJob(
  userId: string,
  jobId: string,
  repository: JobRepositoryPort,
): Promise<Job> {
  return repository.restore(userId, jobId);
}
