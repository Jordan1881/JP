import type { JobRepositoryPort } from "./ports.js";

export async function deleteJob(
  userId: string,
  jobId: string,
  repository: JobRepositoryPort,
): Promise<void> {
  return repository.deletePermanent(userId, jobId);
}
