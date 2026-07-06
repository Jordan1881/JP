import { runDailySweep } from "../services/sweep-service.js";

export async function runUserSweep(userId: string) {
  return runDailySweep(userId);
}
