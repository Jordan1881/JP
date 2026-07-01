import { getDevJobStore } from "../job-repository/factory.js";
import { InMemoryUserAccountStore } from "./in-memory-store.js";
import { UserAccountRepository } from "./user-account.js";

let devRepository: UserAccountRepository | null = null;

export function createUserAccountRepository(
  store = new InMemoryUserAccountStore(),
  jobStore = getDevJobStore(),
): UserAccountRepository {
  return new UserAccountRepository(store, jobStore);
}

export function getDevUserAccountRepository(): UserAccountRepository {
  devRepository ??= createUserAccountRepository();
  return devRepository;
}
