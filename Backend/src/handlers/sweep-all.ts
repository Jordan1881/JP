import { getDevJobStore } from "../modules/job-repository/factory.js";
import { runDailySweep } from "../services/sweep-service.js";

export async function handler(): Promise<{ usersProcessed: number }> {
  const userIds = await getDevJobStore().listUserIds();
  for (const userId of userIds) {
    await runDailySweep(userId);
  }
  return { usersProcessed: userIds.length };
}
