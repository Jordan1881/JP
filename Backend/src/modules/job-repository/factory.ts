import { getDevStores } from "../../services/composition-root.js";
import { JobRepository } from "./job-repository.js";
import { InMemoryJobStore } from "./in-memory-store.js";
import type { JobStore } from "./types.js";
import type { UserPreferencesRepository } from "../user-preferences/user-preferences.js";

export function createJobRepository(
  store: JobStore = new InMemoryJobStore(),
  preferences?: UserPreferencesRepository,
): JobRepository {
  return new JobRepository(store, preferences);
}

export function getDevJobStore(): InMemoryJobStore {
  return getDevStores().jobStore as InMemoryJobStore;
}

export function getDevJobRepository(): JobRepository {
  return getDevStores().jobRepository;
}
