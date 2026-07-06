import { describe, expect, it } from "vitest";
import {
  ApplicationError,
  createAccount,
  deleteAccount,
  getAccount,
} from "@backend/application/index.js";
import { createJobRepository } from "@backend/modules/job-repository/factory.js";
import { InMemoryJobStore } from "@backend/modules/job-repository/in-memory-store.js";
import {
  InMemoryNotificationStore,
  NotificationCenter,
} from "@backend/modules/notification-center/index.js";
import {
  InMemoryProfileStore,
} from "@backend/modules/profile-repository/profile-repository.js";
import {
  InMemoryUserPreferencesStore,
} from "@backend/modules/user-preferences/user-preferences.js";
import { createUserAccountRepository } from "@backend/modules/user-account/factory.js";
import { InMemoryUserAccountStore } from "@backend/modules/user-account/in-memory-store.js";
import { UserAccountRepository } from "@backend/modules/user-account/user-account.js";
import { CURRENT_TERMS_VERSION } from "@jp/shared-types";

function isolatedRepository(): {
  repository: UserAccountRepository;
  jobStore: InMemoryJobStore;
  profileStore: InMemoryProfileStore;
  preferencesStore: InMemoryUserPreferencesStore;
  notificationCenter: NotificationCenter;
} {
  const accountStore = new InMemoryUserAccountStore();
  const jobStore = new InMemoryJobStore();
  const profileStore = new InMemoryProfileStore();
  const preferencesStore = new InMemoryUserPreferencesStore();
  const notificationStore = new InMemoryNotificationStore();
  const notificationCenter = new NotificationCenter(notificationStore);

  return {
    repository: createUserAccountRepository(
      accountStore,
      jobStore,
      profileStore,
      preferencesStore,
      notificationStore,
    ),
    jobStore,
    profileStore,
    preferencesStore,
    notificationCenter,
  };
}

function repository(): UserAccountRepository {
  return isolatedRepository().repository;
}

describe("account application", () => {
  it("getAccount throws 404 when missing", async () => {
    await expect(getAccount(repository(), "missing")).rejects.toMatchObject({
      statusCode: 404,
      message: "Account not found",
    });
  });

  it("createAccount and getAccount round-trip", async () => {
    const repo = repository();
    const userId = "user-1";
    const created = await createAccount(repo, userId, {
      name: "Jordan",
      email: "jordan@example.com",
      termsVersion: CURRENT_TERMS_VERSION,
    });
    expect(created.account.name).toBe("Jordan");

    const loaded = await getAccount(repo, userId);
    expect(loaded.account.email).toBe("jordan@example.com");
  });

  it("deleteAccount requires confirmation", async () => {
    const repo = repository();
    const userId = "user-2";
    await createAccount(repo, userId, {
      name: "Jordan",
      email: "jordan@example.com",
      termsVersion: CURRENT_TERMS_VERSION,
    });

    await expect(
      deleteAccount(repo, userId, { confirm: false as unknown as true }),
    ).rejects.toBeInstanceOf(ApplicationError);
  });

  it("deleteAccount clears jobs, notifications, profile, and preferences", async () => {
    const {
      repository: repo,
      jobStore,
      profileStore,
      preferencesStore,
      notificationCenter,
    } = isolatedRepository();
    const jobRepository = createJobRepository(jobStore);
    const userId = "user-cascade";

    await createAccount(repo, userId, {
      name: "Jordan",
      email: "jordan@example.com",
      termsVersion: CURRENT_TERMS_VERSION,
    });

    const job = await jobRepository.create(userId, {
      title: "Engineer",
      company: "Acme",
      submissionDate: "2026-01-01",
    });
    await profileStore.save({
      userId,
      techStack: ["TypeScript"],
      targetRoles: ["Engineer"],
      seniority: "Mid",
      yearsOfExperience: 3,
      locationPreference: "Remote",
      remotePreference: "Remote",
      salaryExpectations: "100k",
      notableProjects: "JP",
      softSkills: "Communication",
      careerNarrative: "Builder",
      interviewCompletedAt: "2026-01-01T00:00:00.000Z",
    });
    await preferencesStore.save({
      userId,
      staleNotificationsEnabled: true,
      preDeletionWarningsEnabled: true,
      stageList: ["Submitted Resume"],
    });
    await notificationCenter.create({
      userId,
      type: "stale_job",
      jobId: job.id,
      title: "Stale",
      message: "Update stage",
    });

    await deleteAccount(repo, userId, { confirm: true });

    await expect(getAccount(repo, userId)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(await jobRepository.getById(userId, job.id)).toBeNull();
    expect(await notificationCenter.list(userId)).toEqual([]);
    expect(await profileStore.get(userId)).toBeNull();
    expect(await preferencesStore.get(userId)).toBeNull();
  });
});
