import type { Job } from "@jp/shared-types";

export const ARCHIVE_EXPIRY_DAYS = 30;

export function isPermanentArchive(job: Job): boolean {
  return job.archiveReason === "accepted" || job.archiveReason === "rejected";
}

export function daysArchived(job: Job, now = new Date()): number {
  if (!job.archivedAt) return 0;
  return Math.floor((now.getTime() - new Date(job.archivedAt).getTime()) / 86400000);
}

export function daysUntilArchiveDeletion(job: Job, now = new Date()): number | null {
  if (job.status !== "archived" || !job.archivedAt || isPermanentArchive(job)) return null;
  return Math.max(0, ARCHIVE_EXPIRY_DAYS - daysArchived(job, now));
}
