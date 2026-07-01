import type { Job, PatchJobInput } from "@jp/shared-types";
import { authHeaders } from "./auth";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data;
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
