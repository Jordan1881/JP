import type {
  AppNotification,
  UpdateUserPreferencesInput,
  UserPreferences,
} from "@jp/shared-types";
import { authHeaders } from "./auth";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data;
}

export async function fetchPreferences(): Promise<UserPreferences> {
  const response = await fetch("/api/preferences", {
    headers: await authHeaders(),
  });
  const data = await parseJson<{ preferences: UserPreferences }>(response);
  return data.preferences;
}

export async function updatePreferences(
  input: UpdateUserPreferencesInput,
): Promise<UserPreferences> {
  const response = await fetch("/api/preferences", {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ preferences: UserPreferences }>(response);
  return data.preferences;
}

export async function fetchNotifications(): Promise<{
  notifications: AppNotification[];
  unreadCount: number;
}> {
  const response = await fetch("/api/notifications", {
    headers: await authHeaders(),
  });
  return parseJson(response);
}

export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  const response = await fetch(`/api/notifications/${notificationId}/read`, {
    method: "POST",
    headers: await authHeaders(),
  });
  await parseJson(response);
}

export async function markAllNotificationsRead(): Promise<void> {
  const response = await fetch("/api/notifications/read-all", {
    method: "POST",
    headers: await authHeaders(),
  });
  await parseJson(response);
}

export async function runSweep(): Promise<{
  createdNotifications: number;
  deletedJobs: number;
}> {
  const response = await fetch("/api/sweep", {
    method: "POST",
    headers: await authHeaders(),
  });
  return parseJson(response);
}
