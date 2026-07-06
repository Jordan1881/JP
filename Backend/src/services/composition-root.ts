import type pg from "pg";
import { JobRepository } from "../modules/job-repository/job-repository.js";
import { InMemoryJobStore } from "../modules/job-repository/in-memory-store.js";
import { PostgresJobStore } from "../modules/job-repository/postgres-store.js";
import type { JobStore } from "../modules/job-repository/types.js";
import { UserAccountRepository } from "../modules/user-account/user-account.js";
import { InMemoryUserAccountStore } from "../modules/user-account/in-memory-store.js";
import { PostgresUserAccountStore } from "../modules/user-account/postgres-store.js";
import {
  ProfileRepository,
  InMemoryProfileStore,
  type ProfileStore,
} from "../modules/profile-repository/profile-repository.js";
import { PostgresProfileStore } from "../modules/profile-repository/postgres-store.js";
import {
  UserPreferencesRepository,
  InMemoryUserPreferencesStore,
  type UserPreferencesStore,
} from "../modules/user-preferences/user-preferences.js";
import { PostgresUserPreferencesStore } from "../modules/user-preferences/postgres-store.js";
import {
  NotificationCenter,
  InMemoryNotificationStore,
} from "../modules/notification-center/notification-center.js";
import { PostgresNotificationStore } from "../modules/notification-center/postgres-store.js";
import type { NotificationStore } from "../modules/notification-center/notification-center.js";

/** Full persistence port graph wired for ApiHandler, sweep, and dev fallbacks. */
export interface Stores {
  jobStore: JobStore;
  jobRepository: JobRepository;
  userAccountRepository: UserAccountRepository;
  profileStore: ProfileStore;
  profileRepository: ProfileRepository;
  preferencesStore: UserPreferencesStore;
  userPreferencesRepository: UserPreferencesRepository;
  notificationStore: NotificationStore;
  notificationCenter: NotificationCenter;
}

let devStores: Stores | null = null;

/** In-memory singleton graph — one wiring path for local dev and Amplify fallbacks. */
export function buildDevStores(): Stores {
  const jobStore = new InMemoryJobStore();
  const profileStore = new InMemoryProfileStore();
  const preferencesStore = new InMemoryUserPreferencesStore();
  const notificationStore = new InMemoryNotificationStore();

  return {
    jobStore,
    jobRepository: new JobRepository(jobStore),
    userAccountRepository: new UserAccountRepository(
      new InMemoryUserAccountStore(),
      jobStore,
      profileStore,
      preferencesStore,
      notificationStore,
    ),
    profileStore,
    profileRepository: new ProfileRepository(profileStore),
    preferencesStore,
    userPreferencesRepository: new UserPreferencesRepository(preferencesStore),
    notificationStore,
    notificationCenter: new NotificationCenter(notificationStore),
  };
}

export function getDevStores(): Stores {
  devStores ??= buildDevStores();
  return devStores;
}

/** Postgres graph — same adapter relationships as dev (account delete cascades all ports). */
export function buildPostgresStores(pool: pg.Pool): Stores {
  const jobStore = new PostgresJobStore(pool);
  const profileStore = new PostgresProfileStore(pool);
  const preferencesStore = new PostgresUserPreferencesStore(pool);
  const notificationStore = new PostgresNotificationStore(pool);

  return {
    jobStore,
    jobRepository: new JobRepository(jobStore),
    userAccountRepository: new UserAccountRepository(
      new PostgresUserAccountStore(pool),
      jobStore,
      profileStore,
      preferencesStore,
      notificationStore,
    ),
    profileStore,
    profileRepository: new ProfileRepository(profileStore),
    preferencesStore,
    userPreferencesRepository: new UserPreferencesRepository(preferencesStore),
    notificationStore,
    notificationCenter: new NotificationCenter(notificationStore),
  };
}

/** Reset dev singleton between tests. */
export function resetDevStores(): void {
  devStores = null;
}
