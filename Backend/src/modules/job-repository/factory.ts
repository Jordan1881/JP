import { JobRepository } from "./job-repository.js";
import { InMemoryJobStore } from "./in-memory-store.js";

let devRepository: JobRepository | null = null;

export function createJobRepository(
  store = new InMemoryJobStore(),
): JobRepository {
  return new JobRepository(store);
}

export function getDevJobRepository(): JobRepository {
  devRepository ??= createJobRepository();
  return devRepository;
}
