import { computeDashboardStats } from "../modules/dashboard-analytics/index.js";
import type { JobRepository } from "../modules/job-repository/index.js";
import type { ListJobsQuery } from "@jp/shared-types";

export async function getDashboardStats(
  jobRepository: JobRepository,
  userId: string,
  query: ListJobsQuery = { status: "all", sortOrder: "desc" },
) {
  const jobs = await jobRepository.list(userId, query);
  return { stats: computeDashboardStats(jobs) };
}
