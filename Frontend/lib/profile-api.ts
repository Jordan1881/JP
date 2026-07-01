import type { CareerProfile, DashboardStats, UpdateProfileInput } from "@jp/shared-types";
import type { AgentChatMessage } from "@jp/shared-types";
import { authHeaders } from "./auth";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data;
}

export async function fetchProfile(): Promise<CareerProfile | null> {
  const response = await fetch("/api/profile", {
    headers: await authHeaders(),
  });
  const data = await parseJson<{ profile: CareerProfile | null }>(response);
  return data.profile;
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<CareerProfile> {
  const response = await fetch("/api/profile", {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ profile: CareerProfile }>(response);
  return data.profile;
}

export async function profileInterviewStep(input: {
  messages: AgentChatMessage[];
  completedTopics: string[];
  answer?: string;
}): Promise<{
  complete: boolean;
  messages: AgentChatMessage[];
  completedTopics: string[];
  profile?: CareerProfile;
}> {
  const response = await fetch("/api/profile/interview", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch("/api/dashboard", {
    headers: await authHeaders(),
  });
  const data = await parseJson<{ stats: DashboardStats }>(response);
  return data.stats;
}
