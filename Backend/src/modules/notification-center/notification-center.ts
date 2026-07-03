import { randomUUID } from "node:crypto";
import type { AppNotification, NotificationType } from "@jp/shared-types";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  jobId: string;
  title: string;
  message: string;
}

export interface NotificationStore {
  insert(notification: AppNotification): Promise<AppNotification>;
  listByUser(userId: string): Promise<AppNotification[]>;
  findById(id: string, userId: string): Promise<AppNotification | null>;
  update(notification: AppNotification): Promise<AppNotification>;
  deleteByUser(userId: string): Promise<void>;
}

export class InMemoryNotificationStore implements NotificationStore {
  private readonly notifications = new Map<string, AppNotification>();

  async insert(notification: AppNotification): Promise<AppNotification> {
    this.notifications.set(notification.id, structuredClone(notification));
    return structuredClone(notification);
  }

  async listByUser(userId: string): Promise<AppNotification[]> {
    return [...this.notifications.values()]
      .filter((item) => item.userId === userId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((item) => structuredClone(item));
  }

  async findById(id: string, userId: string): Promise<AppNotification | null> {
    const notification = this.notifications.get(id);
    if (!notification || notification.userId !== userId) {
      return null;
    }
    return structuredClone(notification);
  }

  async update(notification: AppNotification): Promise<AppNotification> {
    this.notifications.set(notification.id, structuredClone(notification));
    return structuredClone(notification);
  }

  async deleteByUser(userId: string): Promise<void> {
    for (const [id, notification] of this.notifications) {
      if (notification.userId === userId) {
        this.notifications.delete(id);
      }
    }
  }

  clear(): void {
    this.notifications.clear();
  }
}

export class NotificationCenter {
  constructor(private readonly store: NotificationStore) {}

  async list(userId: string): Promise<AppNotification[]> {
    return this.store.listByUser(userId);
  }

  async unreadCount(userId: string): Promise<number> {
    const notifications = await this.store.listByUser(userId);
    return notifications.filter((item) => !item.read).length;
  }

  async create(input: CreateNotificationInput): Promise<AppNotification> {
    const notification: AppNotification = {
      id: randomUUID(),
      userId: input.userId,
      type: input.type,
      jobId: input.jobId,
      title: input.title,
      message: input.message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    return this.store.insert(notification);
  }

  /**
   * Dismissing a reminder starts the next 14-day cadence (story 17), so the
   * read timestamp is recorded as lastRemindedAt for the staleness sweep.
   */
  async markRead(
    userId: string,
    notificationId: string,
    now: string = new Date().toISOString(),
  ): Promise<AppNotification> {
    const existing = await this.store.findById(notificationId, userId);
    if (!existing) {
      throw new Error("Notification not found");
    }
    return this.store.update({ ...existing, read: true, lastRemindedAt: now });
  }

  async markAllRead(
    userId: string,
    now: string = new Date().toISOString(),
  ): Promise<void> {
    const notifications = await this.store.listByUser(userId);
    for (const notification of notifications) {
      if (!notification.read) {
        await this.store.update({
          ...notification,
          read: true,
          lastRemindedAt: now,
        });
      }
    }
  }

  async touchReminder(
    userId: string,
    notificationId: string,
    now: string = new Date().toISOString(),
  ): Promise<AppNotification> {
    const existing = await this.store.findById(notificationId, userId);
    if (!existing) {
      throw new Error("Notification not found");
    }
    return this.store.update({
      ...existing,
      read: false,
      lastRemindedAt: now,
      createdAt: now,
    });
  }
}
