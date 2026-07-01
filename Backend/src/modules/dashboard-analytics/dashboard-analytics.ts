import type { DashboardStats, Job } from "@jp/shared-types";

export function computeDashboardStats(jobs: Job[]): DashboardStats {
  const activeByStage: Record<string, number> = {};

  let totalAccepted = 0;
  let totalRejected = 0;
  let totalNoResponse = 0;

  for (const job of jobs) {
    if (job.status === "active") {
      activeByStage[job.currentStage] =
        (activeByStage[job.currentStage] ?? 0) + 1;
    }

    if (job.status === "archived") {
      if (job.archiveReason === "accepted") {
        totalAccepted += 1;
      } else if (job.archiveReason === "rejected") {
        totalRejected += 1;
      } else if (job.archiveReason === "no_response") {
        totalNoResponse += 1;
      }
    }
  }

  return {
    totalApplied: jobs.length,
    totalAccepted,
    totalRejected,
    totalNoResponse,
    activeByStage,
  };
}
