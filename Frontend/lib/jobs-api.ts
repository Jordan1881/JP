import type { Job, ListJobsQuery, PatchJobInput } from "@jp/shared-types";
import { authHeaders } from "./auth";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data;
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
  const response = await fetch(`/api/jobs${queryString(query)}`, {
    headers: await authHeaders(),
  });
  const data = await parseJson<{ jobs: Job[] }>(response);
  return data.jobs;
}

export async function fetchJob(jobId: string): Promise<Job> {
  const response = await fetch(`/api/jobs/${jobId}`, {
    headers: await authHeaders(),
  });
  const data = await parseJson<{ job: Job }>(response);
  return data.job;
}

export async function patchJob(
  jobId: string,
  input: PatchJobInput,
): Promise<Job> {
  const response = await fetch(`/api/jobs/${jobId}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ job: Job }>(response);
  return data.job;
}

export async function archiveJob(
  jobId: string,
  reason: "manual" | "no_response" = "manual",
): Promise<Job> {
  const response = await fetch(`/api/jobs/${jobId}/archive`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ reason }),
  });
  const data = await parseJson<{ job: Job }>(response);
  return data.job;
}

export async function restoreJob(jobId: string): Promise<Job> {
  const response = await fetch(`/api/jobs/${jobId}/restore`, {
    method: "POST",
    headers: await authHeaders(),
  });
  const data = await parseJson<{ job: Job }>(response);
  return data.job;
}

export async function deleteJob(jobId: string): Promise<void> {
  const response = await fetch(`/api/jobs/${jobId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  await parseJson<{ deleted: boolean }>(response);
}

export async function generateCoverLetter(
  jobId: string,
  input: { action: "generate" | "revise"; instruction?: string },
): Promise<{ job: Job; draft: string }> {
  const response = await fetch(`/api/jobs/${jobId}/cover-letter`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function generateAnnouncement(
  jobId: string,
  input: { action: "generate" | "revise"; instruction?: string },
): Promise<{ job: Job; draft: string }> {
  const response = await fetch(`/api/jobs/${jobId}/announcement`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  return parseJson(response);
}
