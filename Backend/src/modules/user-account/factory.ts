import { getDevJobStore } from "../job-repository/factory.js";
import type { JobStore } from "../job-repository/types.js";
import {
  getDevProfileStore,
  type ProfileStore,
} from "../profile-repository/index.js";
import {
  getDevUserPreferencesStore,
  type UserPreferencesStore,
} from "../user-preferences/index.js";
import { InMemoryUserAccountStore } from "./in-memory-store.js";
import { UserAccountRepository } from "./user-account.js";
import type { UserAccountStore } from "./types.js";

let devRepository: UserAccountRepository | null = null;

export function createUserAccountRepository(
  store: UserAccountStore = new InMemoryUserAccountStore(),
  jobStore: JobStore = getDevJobStore(),
  profileStore: ProfileStore = getDevProfileStore(),
  preferencesStore: UserPreferencesStore = getDevUserPreferencesStore(),
): UserAccountRepository {
  return new UserAccountRepository(
    store,
    jobStore,
    profileStore,
    preferencesStore,
  );
}

export function getDevUserAccountRepository(): UserAccountRepository {
  devRepository ??= createUserAccountRepository();
  return devRepository;
}
