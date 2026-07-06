import type { CreateJobInput, Job } from "@jp/shared-types";
import type { JobRepositoryPort } from "./ports.js";

export async function createJob(
  userId: string,
  input: CreateJobInput,
  repository: JobRepositoryPort,
): Promise<Job> {
  return repository.create(userId, input);
}
