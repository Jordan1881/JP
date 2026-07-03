import {
  getJobRepository,
  getNotificationCenter,
  getUserPreferencesRepository,
} from "./store-provider.js";
import { runStalenessSweep } from "../modules/staleness-scheduler/index.js";

export async function runDailySweep(userId: string, now?: Date): Promise<{
  createdNotifications: number;
  deletedJobs: number;
}> {
  const jobRepository = await getJobRepository();
  const preferencesRepository = await getUserPreferencesRepository();
  const notificationCenter = await getNotificationCenter();
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
