import { getJobStore } from "../services/store-provider.js";
import { runDailySweep } from "../services/sweep-service.js";

export async function handler(): Promise<{ usersProcessed: number }> {
  const userIds = await (await getJobStore()).listUserIds();
  for (const userId of userIds) {
    await runDailySweep(userId);
  }
  return { usersProcessed: userIds.length };
}
