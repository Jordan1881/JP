import type { Job } from "@jp/shared-types";
import type { JobRepositoryPort } from "./ports.js";

export async function getJob(
  userId: string,
  jobId: string,
  repository: JobRepositoryPort,
): Promise<Job | null> {
  return repository.getById(userId, jobId);
}
