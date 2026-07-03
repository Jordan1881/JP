import type pg from "pg";
import { resolveDatabaseConfig } from "../db/config.js";
import { createPool } from "../db/pool.js";
import { runMigrations } from "../db/migrate.js";
import { migrations } from "../db/migrations/index.js";
import {
  JobRepository,
  PostgresJobStore,
  getDevJobRepository,
  getDevJobStore,
} from "../modules/job-repository/index.js";
import type { JobStore } from "../modules/job-repository/index.js";
import {
  UserAccountRepository,
  PostgresUserAccountStore,
  getDevUserAccountRepository,
} from "../modules/user-account/index.js";
import {
  ProfileRepository,
  PostgresProfileStore,
  getDevProfileRepository,
} from "../modules/profile-repository/index.js";
import {
  UserPreferencesRepository,
  PostgresUserPreferencesStore,
  getDevUserPreferencesRepository,
} from "../modules/user-preferences/index.js";
import {
  NotificationCenter,
  PostgresNotificationStore,
  getDevNotificationCenter,
} from "../modules/notification-center/index.js";

/**
 * Selects the persistence backend for the monolithic ApiHandler and the
 * SweepHandler (ADR-0003): Postgres when the environment configures a
 * database (DATABASE_URL, or DATABASE_HOST with credentials or DB_SECRET_ARN),
 * in-memory dev singletons otherwise.
 *
 * One pool per Lambda container, created lazily on first use. Pending
 * migrations are applied once per container before the first query — combined
 * with Aurora auto-pause resume this can make the first request after idle
 * take ~15s (ADR-0002).
 */

interface Stores {
  jobStore: JobStore;
  jobRepository: JobRepository;
  userAccountRepository: UserAccountRepository;
  profileRepository: ProfileRepository;
  userPreferencesRepository: UserPreferencesRepository;
  notificationCenter: NotificationCenter;
}

let poolPromise: Promise<pg.Pool | null> | null = null;
let postgresStores: Stores | null = null;

async function fetchDbCredentials(
  secretArn: string,
): Promise<{ username: string; password: string }> {
  const { SecretsManagerClient, GetSecretValueCommand } = await import(
    "@aws-sdk/client-secrets-manager"
  );
  const client = new SecretsManagerClient({});
  const result = await client.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );
  if (!result.SecretString) {
    throw new Error("Database secret has no string value");
  }
  const secret = JSON.parse(result.SecretString) as {
    username?: string;
    password?: string;
  };
  if (!secret.username || !secret.password) {
    throw new Error("Database secret is missing username/password");
  }
  return { username: secret.username, password: secret.password };
}

async function initPool(): Promise<pg.Pool | null> {
  let config = resolveDatabaseConfig();
  if (!config) {
    return null;
  }

  const needsCredentials =
    !config.connectionString && (!config.user || !config.password);
  if (needsCredentials) {
    const secretArn = process.env.DB_SECRET_ARN;
    if (!secretArn) {
      throw new Error(
        "DATABASE_HOST is set but no credentials: provide DATABASE_USER/DATABASE_PASSWORD or DB_SECRET_ARN",
      );
    }
    const credentials = await fetchDbCredentials(secretArn);
    config = {
      ...config,
      user: credentials.username,
      password: credentials.password,
    };
  }

  const pool = createPool(config);
  await runMigrations(pool, migrations);
  return pool;
}

/** Resolves to null when no database is configured (local dev, unit tests). */
export function getPool(): Promise<pg.Pool | null> {
  poolPromise ??= initPool();
  return poolPromise;
}

function buildPostgresStores(pool: pg.Pool): Stores {
  const jobStore = new PostgresJobStore(pool);
  return {
    jobStore,
    jobRepository: new JobRepository(jobStore),
    userAccountRepository: new UserAccountRepository(
      new PostgresUserAccountStore(pool),
      jobStore,
    ),
    profileRepository: new ProfileRepository(new PostgresProfileStore(pool)),
    userPreferencesRepository: new UserPreferencesRepository(
      new PostgresUserPreferencesStore(pool),
    ),
    notificationCenter: new NotificationCenter(
      new PostgresNotificationStore(pool),
    ),
  };
}

async function getStores(): Promise<Stores> {
  const pool = await getPool();
  if (!pool) {
    return {
      jobStore: getDevJobStore(),
      jobRepository: getDevJobRepository(),
      userAccountRepository: getDevUserAccountRepository(),
      profileRepository: getDevProfileRepository(),
      userPreferencesRepository: getDevUserPreferencesRepository(),
      notificationCenter: getDevNotificationCenter(),
    };
  }
  postgresStores ??= buildPostgresStores(pool);
  return postgresStores;
}

export async function getJobRepository(): Promise<JobRepository> {
  return (await getStores()).jobRepository;
}

export async function getJobStore(): Promise<JobStore> {
  return (await getStores()).jobStore;
}

export async function getUserAccountRepository(): Promise<UserAccountRepository> {
  return (await getStores()).userAccountRepository;
}

export async function getProfileRepository(): Promise<ProfileRepository> {
  return (await getStores()).profileRepository;
}

export async function getUserPreferencesRepository(): Promise<UserPreferencesRepository> {
  return (await getStores()).userPreferencesRepository;
}

export async function getNotificationCenter(): Promise<NotificationCenter> {
  return (await getStores()).notificationCenter;
}
