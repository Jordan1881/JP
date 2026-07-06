import { getDevStores } from "../../services/composition-root.js";
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
import { getDevNotificationStore } from "../notification-center/index.js";
import type { NotificationStore } from "../notification-center/notification-center.js";
import { InMemoryUserAccountStore } from "./in-memory-store.js";
import { UserAccountRepository } from "./user-account.js";
import type { UserAccountStore } from "./types.js";

export function createUserAccountRepository(
  store: UserAccountStore = new InMemoryUserAccountStore(),
  jobStore: JobStore = getDevJobStore(),
  profileStore: ProfileStore = getDevProfileStore(),
  preferencesStore: UserPreferencesStore = getDevUserPreferencesStore(),
  notificationStore: NotificationStore = getDevNotificationStore(),
): UserAccountRepository {
  return new UserAccountRepository(
    store,
    jobStore,
    profileStore,
    preferencesStore,
    notificationStore,
  );
}

export function getDevUserAccountRepository(): UserAccountRepository {
  return getDevStores().userAccountRepository;
}
