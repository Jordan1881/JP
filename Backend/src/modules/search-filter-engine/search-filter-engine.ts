import type { Job, ListJobsQuery } from "@jp/shared-types";

export function searchAndFilterJobs(
  jobs: Job[],
  query: ListJobsQuery = {},
): Job[] {
  let result = [...jobs];
  const status = query.status ?? "active";

  if (status !== "all") {
    result = result.filter((job) => job.status === status);
  }

  if (query.stage?.trim()) {
    const stage = query.stage.trim();
    result = result.filter((job) => job.currentStage === stage);
  }

  const search = query.q?.trim().toLowerCase();
  if (search) {
    result = result.filter((job) => {
      const haystack = [
        job.title,
        job.company,
        job.jobNumber ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  const sortOrder = query.sortOrder ?? "desc";
  result.sort((left, right) => {
    const comparison = left.lastUpdatedAt.localeCompare(right.lastUpdatedAt);
    return sortOrder === "desc" ? -comparison : comparison;
  });

  return result;
}
