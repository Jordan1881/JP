import type { Job, ListJobsQuery } from "@jp/shared-types";
import type { JobRepositoryPort } from "./ports.js";

export async function listJobs(
  userId: string,
  query: ListJobsQuery,
  repository: JobRepositoryPort,
): Promise<Job[]> {
  return repository.list(userId, query);
}
