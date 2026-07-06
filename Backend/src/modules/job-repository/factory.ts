import { getDevStores } from "../../services/composition-root.js";
import { JobRepository } from "./job-repository.js";
import { InMemoryJobStore } from "./in-memory-store.js";
import type { JobStore } from "./types.js";

export function createJobRepository(
  store: JobStore = new InMemoryJobStore(),
): JobRepository {
  return new JobRepository(store);
}

export function getDevJobStore(): InMemoryJobStore {
  return getDevStores().jobStore as InMemoryJobStore;
}

export function getDevJobRepository(): JobRepository {
  return getDevStores().jobRepository;
}
