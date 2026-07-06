import { runUserSweep } from "../application/sweep.js";
import {
  getJobRepository,
  getNotificationCenter,
  getUserPreferencesRepository,
} from "./store-provider.js";

export async function runDailySweep(userId: string, now?: Date): Promise<{
  createdNotifications: number;
  deletedJobs: number;
}> {
  const [jobRepository, preferencesRepository, notificationCenter] =
    await Promise.all([
      getJobRepository(),
      getUserPreferencesRepository(),
      getNotificationCenter(),
    ]);

  return runUserSweep(
    { jobRepository, preferencesRepository, notificationCenter },
    userId,
    now,
  );
}
