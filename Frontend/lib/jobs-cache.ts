import type { Job } from "@jp/shared-types";

const PREFIX = "jp-jobs:";

export function getCachedJobs(userId: string): Job[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(`${PREFIX}${userId}`);
    return raw ? (JSON.parse(raw) as Job[]) : [];
  } catch {
    return [];
  }
}

export function setCachedJobs(userId: string, jobs: Job[]): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(`${PREFIX}${userId}`, JSON.stringify(jobs));
}

export function upsertCachedJob(userId: string, job: Job): void {
  const jobs = getCachedJobs(userId);
  const index = jobs.findIndex((entry) => entry.id === job.id);
  if (index >= 0) {
    jobs[index] = job;
  } else {
    jobs.push(job);
  }
  setCachedJobs(userId, jobs);
}

export function removeCachedJob(userId: string, jobId: string): void {
  setCachedJobs(
    userId,
    getCachedJobs(userId).filter((job) => job.id !== jobId),
  );
}

export function mergeCachedJobs(userId: string, apiJobs: Job[]): Job[] {
  const byId = new Map<string, Job>();
  for (const job of getCachedJobs(userId)) {
    byId.set(job.id, job);
  }
  for (const job of apiJobs) {
    byId.set(job.id, job);
  }
  const merged = [...byId.values()];
  setCachedJobs(userId, merged);
  return merged;
}
