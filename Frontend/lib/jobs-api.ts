import type {
  CreateJobInput,
  Job,
  ListJobsQuery,
  PatchJobInput,
} from "@jp/shared-types";
import { searchAndFilterJobs } from "@jp/shared-types";
import { authGetCurrentUser, authHeaders } from "./auth";
import {
  getCachedJobs,
  mergeCachedJobs,
  removeCachedJob,
  upsertCachedJob,
} from "./jobs-cache";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data;
}

async function currentUserId(): Promise<string | null> {
  const user = await authGetCurrentUser();
  return user?.userId ?? null;
}

function queryString(query: ListJobsQuery = {}): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.stage) params.set("stage", query.stage);
  if (query.status) params.set("status", query.status);
  if (query.sortOrder) params.set("sortOrder", query.sortOrder);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export async function fetchJobs(query: ListJobsQuery = {}): Promise<Job[]> {
  const userId = await currentUserId();
  const response = await fetch(`/api/jobs${queryString(query)}`, {
    headers: await authHeaders(),
  });
  const data = await parseJson<{ jobs: Job[] }>(response);

  if (!userId) {
    return data.jobs;
  }

  const merged =
    data.jobs.length > 0
      ? mergeCachedJobs(userId, data.jobs)
      : getCachedJobs(userId);

  return searchAndFilterJobs(merged, query);
}

export async function createJob(input: CreateJobInput): Promise<Job> {
  const userId = await currentUserId();
  const response = await fetch("/api/jobs", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ job: Job }>(response);
  if (userId) {
    upsertCachedJob(userId, data.job);
  }
  return data.job;
}

export async function fetchJob(jobId: string): Promise<Job> {
  const userId = await currentUserId();
  const response = await fetch(`/api/jobs/${jobId}`, {
    headers: await authHeaders(),
  });

  if (response.status === 404 && userId) {
    const cached = getCachedJobs(userId).find((job) => job.id === jobId);
    if (cached) {
      return cached;
    }
  }

  const data = await parseJson<{ job: Job }>(response);
  if (userId) {
    upsertCachedJob(userId, data.job);
  }
  return data.job;
}

export async function patchJob(
  jobId: string,
  input: PatchJobInput,
): Promise<Job> {
  const userId = await currentUserId();
  const response = await fetch(`/api/jobs/${jobId}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ job: Job }>(response);
  if (userId) {
    upsertCachedJob(userId, data.job);
  }
  return data.job;
}

export async function archiveJob(
  jobId: string,
  reason: "manual" | "no_response" = "manual",
): Promise<Job> {
  const userId = await currentUserId();
  const response = await fetch(`/api/jobs/${jobId}/archive`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ reason }),
  });
  const data = await parseJson<{ job: Job }>(response);
  if (userId) {
    upsertCachedJob(userId, data.job);
  }
  return data.job;
}

export async function restoreJob(jobId: string): Promise<Job> {
  const userId = await currentUserId();
  const response = await fetch(`/api/jobs/${jobId}/restore`, {
    method: "POST",
    headers: await authHeaders(),
  });
  const data = await parseJson<{ job: Job }>(response);
  if (userId) {
    upsertCachedJob(userId, data.job);
  }
  return data.job;
}

export async function deleteJob(jobId: string): Promise<void> {
  const userId = await currentUserId();
  const response = await fetch(`/api/jobs/${jobId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  await parseJson<{ deleted: boolean }>(response);
  if (userId) {
    removeCachedJob(userId, jobId);
  }
}

export async function generateCoverLetter(
  jobId: string,
  input: { action: "generate" | "revise"; instruction?: string },
): Promise<{ job: Job; draft: string }> {
  const userId = await currentUserId();
  const response = await fetch(`/api/jobs/${jobId}/cover-letter`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ job: Job; draft: string }>(response);
  if (userId) {
    upsertCachedJob(userId, data.job);
  }
  return data;
}

export async function generateAnnouncement(
  jobId: string,
  input: { action: "generate" | "revise"; instruction?: string },
): Promise<{ job: Job; draft: string }> {
  const userId = await currentUserId();
  const response = await fetch(`/api/jobs/${jobId}/announcement`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ job: Job; draft: string }>(response);
  if (userId) {
    upsertCachedJob(userId, data.job);
  }
  return data;
}
