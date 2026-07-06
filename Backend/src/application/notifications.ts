import type { NotificationCenter } from "../modules/notification-center/index.js";

export async function listNotifications(
  center: NotificationCenter,
  userId: string,
) {
  const [notifications, unreadCount] = await Promise.all([
    center.list(userId),
    center.unreadCount(userId),
  ]);
  return { notifications, unreadCount };
}

export async function markNotificationRead(
  center: NotificationCenter,
  userId: string,
  notificationId: string,
) {
  const notification = await center.markRead(userId, notificationId);
  return { notification };
}

export async function markAllNotificationsRead(
  center: NotificationCenter,
  userId: string,
) {
  await center.markAllRead(userId);
  return { ok: true as const };
}
