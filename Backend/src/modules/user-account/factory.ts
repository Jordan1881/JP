import { getDevJobStore } from "../job-repository/factory.js";
import type { JobStore } from "../job-repository/types.js";
import { InMemoryUserAccountStore } from "./in-memory-store.js";
import { UserAccountRepository } from "./user-account.js";
import type { UserAccountStore } from "./types.js";

let devRepository: UserAccountRepository | null = null;

export function createUserAccountRepository(
  store: UserAccountStore = new InMemoryUserAccountStore(),
  jobStore: JobStore = getDevJobStore(),
): UserAccountRepository {
  return new UserAccountRepository(store, jobStore);
}

export function getDevUserAccountRepository(): UserAccountRepository {
  devRepository ??= createUserAccountRepository();
  return devRepository;
}
