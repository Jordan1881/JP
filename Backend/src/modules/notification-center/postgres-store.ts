import type pg from "pg";
import type { AppNotification, NotificationType } from "@jp/shared-types";
import type { NotificationStore } from "./notification-center.js";

interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  job_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: Date;
  last_reminded_at: Date | null;
}

function rowToNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    jobId: row.job_id,
    title: row.title,
    message: row.message,
    read: row.read,
    createdAt: row.created_at.toISOString(),
    lastRemindedAt: row.last_reminded_at?.toISOString(),
  };
}

export class PostgresNotificationStore implements NotificationStore {
  constructor(private readonly pool: pg.Pool) {}

  async insert(notification: AppNotification): Promise<AppNotification> {
    const { rows } = await this.pool.query<NotificationRow>(
      `INSERT INTO notifications (
         id, user_id, type, job_id, title, message, read, created_at,
         last_reminded_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        notification.id,
        notification.userId,
        notification.type,
        notification.jobId,
        notification.title,
        notification.message,
        notification.read,
        notification.createdAt,
        notification.lastRemindedAt ?? null,
      ],
    );
    return rowToNotification(rows[0]!);
  }

  async listByUser(userId: string): Promise<AppNotification[]> {
    const { rows } = await this.pool.query<NotificationRow>(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map(rowToNotification);
  }

  async findById(id: string, userId: string): Promise<AppNotification | null> {
    const { rows } = await this.pool.query<NotificationRow>(
      "SELECT * FROM notifications WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return rows[0] ? rowToNotification(rows[0]) : null;
  }

  async update(notification: AppNotification): Promise<AppNotification> {
    const { rows } = await this.pool.query<NotificationRow>(
      `UPDATE notifications SET
         read = $3, created_at = $4, last_reminded_at = $5,
         title = $6, message = $7
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        notification.id,
        notification.userId,
        notification.read,
        notification.createdAt,
        notification.lastRemindedAt ?? null,
        notification.title,
        notification.message,
      ],
    );
    if (rows.length === 0) {
      throw new Error("Notification not found");
    }
    return rowToNotification(rows[0]!);
  }

  async deleteByUser(userId: string): Promise<void> {
    await this.pool.query("DELETE FROM notifications WHERE user_id = $1", [
      userId,
    ]);
  }
}
