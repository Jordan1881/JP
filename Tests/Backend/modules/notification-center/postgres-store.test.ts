import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type pg from "pg";
import { createPool } from "@backend/db/pool.js";
import { resolveDatabaseConfig } from "@backend/db/config.js";
import { runMigrations } from "@backend/db/migrate.js";
import { migrations } from "@backend/db/migrations/index.js";
import { createJobRepository, PostgresJobStore } from "@backend/modules/job-repository/index.js";
import {
  NotificationCenter,
  PostgresNotificationStore,
} from "@backend/modules/notification-center/index.js";

const databaseConfigured = Boolean(
  process.env.DATABASE_URL || process.env.DATABASE_HOST,
);

const USER = "pg-notif-user";

// Integration test — requires a real Postgres (see docs/infra/database.md).
describe.skipIf(!databaseConfigured)("PostgresNotificationStore", () => {
  let pool: pg.Pool;
  let store: PostgresNotificationStore;
  let jobId: string;

  beforeAll(async () => {
    const config = resolveDatabaseConfig();
    if (!config) {
      throw new Error("Database config missing despite env gate");
    }
    pool = createPool(config);
    await runMigrations(pool, migrations);
    store = new PostgresNotificationStore(pool);
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM jobs WHERE user_id LIKE 'pg-notif-%'");
    const job = await createJobRepository(new PostgresJobStore(pool)).create(
      USER,
      { title: "Engineer", company: "Acme", submissionDate: "2026-01-15" },
    );
    jobId = job.id;
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("stores notifications and tracks unread count", async () => {
    const center = new NotificationCenter(store);

    const created = await center.create({
      userId: USER,
      type: "stale_job",
      jobId,
      title: "Job going stale",
      message: "No update in 14 days",
    });

    expect(created.read).toBe(false);
    expect(await center.unreadCount(USER)).toBe(1);

    const listed = await center.list(USER);
    expect(listed).toHaveLength(1);
    expect(listed[0]).toEqual(created);
  });

  it("marks read and markAllRead persists", async () => {
    const center = new NotificationCenter(store);
    const first = await center.create({
      userId: USER,
      type: "stale_job",
      jobId,
      title: "Stale",
      message: "msg",
    });
    await center.create({
      userId: USER,
      type: "pre_deletion_warning",
      jobId,
      title: "Deletion soon",
      message: "msg",
    });

    await center.markRead(USER, first.id);
    expect(await center.unreadCount(USER)).toBe(1);

    await center.markAllRead(USER);
    expect(await center.unreadCount(USER)).toBe(0);
  });

  it("touchReminder resurfaces a notification as unread with lastRemindedAt", async () => {
    const center = new NotificationCenter(store);
    const created = await center.create({
      userId: USER,
      type: "stale_job",
      jobId,
      title: "Stale",
      message: "msg",
    });
    await center.markRead(USER, created.id);

    const now = new Date().toISOString();
    const reminded = await center.touchReminder(USER, created.id, now);

    expect(reminded.read).toBe(false);
    expect(reminded.lastRemindedAt).toBe(now);
    expect(await center.unreadCount(USER)).toBe(1);
  });

  it("is scoped per user", async () => {
    const center = new NotificationCenter(store);
    const created = await center.create({
      userId: USER,
      type: "stale_job",
      jobId,
      title: "Stale",
      message: "msg",
    });

    expect(await store.findById(created.id, "pg-notif-other")).toBeNull();
    expect(await center.list("pg-notif-other")).toEqual([]);
  });
});
