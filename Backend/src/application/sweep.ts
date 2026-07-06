import type { JobRepository } from "../modules/job-repository/index.js";
import type { NotificationCenter } from "../modules/notification-center/index.js";
import type { UserPreferencesRepository } from "../modules/user-preferences/index.js";
import { runStalenessSweep } from "../modules/staleness-scheduler/index.js";

export interface SweepDeps {
  jobRepository: JobRepository;
  preferencesRepository: UserPreferencesRepository;
  notificationCenter: NotificationCenter;
}

export async function runUserSweep(
  deps: SweepDeps,
  userId: string,
  now?: Date,
): Promise<{
  createdNotifications: number;
  deletedJobs: number;
}> {
  const preferences = await deps.preferencesRepository.getOrCreate(userId);
  const jobs = await deps.jobRepository.list(userId, { status: "all" });
  const notifications = await deps.notificationCenter.list(userId);
  const sweep = runStalenessSweep({ jobs, notifications, preferences, now });

  let createdNotifications = 0;
  for (const item of [...sweep.staleNotifications, ...sweep.preDeletionWarnings]) {
    await deps.notificationCenter.create(item);
    createdNotifications += 1;
  }

  const deletedJobs = await deps.jobRepository.deleteExpired(
    userId,
    sweep.jobsToDelete,
  );

  return { createdNotifications, deletedJobs };
}
