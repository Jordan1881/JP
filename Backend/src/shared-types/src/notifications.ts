export type NotificationType = "stale_job" | "pre_deletion_warning";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  jobId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  lastRemindedAt?: string;
}
