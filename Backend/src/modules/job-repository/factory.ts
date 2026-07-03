import { JobRepository } from "./job-repository.js";
import { InMemoryJobStore } from "./in-memory-store.js";
import type { JobStore } from "./types.js";

let devStore: InMemoryJobStore | null = null;

export function createJobRepository(
  store: JobStore = new InMemoryJobStore(),
): JobRepository {
  return new JobRepository(store);
}

export function getDevJobStore(): InMemoryJobStore {
  devStore ??= new InMemoryJobStore();
  return devStore;
}

export function getDevJobRepository(): JobRepository {
  return createJobRepository(getDevJobStore());
}
