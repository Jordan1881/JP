import { getDevJobRepository } from "../modules/job-repository/factory.js";
import { getDevNotificationCenter } from "../modules/notification-center/index.js";
import { getDevUserPreferencesRepository } from "../modules/user-preferences/index.js";
import { runStalenessSweep } from "../modules/staleness-scheduler/index.js";

export async function runDailySweep(userId: string, now?: Date): Promise<{
  createdNotifications: number;
  deletedJobs: number;
}> {
  const jobRepository = getDevJobRepository();
  const preferencesRepository = getDevUserPreferencesRepository();
  const notificationCenter = getDevNotificationCenter();
  const preferences = await preferencesRepository.getOrCreate(userId);
  const jobs = await jobRepository.list(userId, { status: "all" });
  const notifications = await notificationCenter.list(userId);
  const sweep = runStalenessSweep({ jobs, notifications, preferences, now });

  let createdNotifications = 0;
  for (const item of [...sweep.staleNotifications, ...sweep.preDeletionWarnings]) {
    await notificationCenter.create(item);
    createdNotifications += 1;
  }

  const deletedJobs = await jobRepository.deleteExpired(
    userId,
    sweep.jobsToDelete,
  );

  return { createdNotifications, deletedJobs };
}
