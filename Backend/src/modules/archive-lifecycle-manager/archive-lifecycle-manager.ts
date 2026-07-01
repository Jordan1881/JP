import type { ArchiveReason, Job, TerminalStage } from "@jp/shared-types";

export const ARCHIVE_EXPIRY_DAYS = 30;
export const PRE_DELETION_WARNING_DAY = 25;
export const STALE_JOB_DAYS = 14;

export function archiveReasonForTerminalStage(stage: TerminalStage): ArchiveReason {
  return stage === "Accepted" ? "accepted" : "rejected";
}

export function archiveJob(
  job: Job,
  reason: ArchiveReason,
  now: string = new Date().toISOString(),
): Job {
  return {
    ...job,
    status: "archived",
    archiveReason: reason,
    archivedAt: now,
    lastUpdatedAt: now,
  };
}

export function restoreJob(
  job: Job,
  now: string = new Date().toISOString(),
): Job {
  return {
    ...job,
    status: "active",
    archiveReason: undefined,
    archivedAt: undefined,
    lastUpdatedAt: now,
  };
}

export function isPermanentArchive(job: Job): boolean {
  return (
    job.archiveReason === "accepted" || job.archiveReason === "rejected"
  );
}

export function daysSince(iso: string, now: Date): number {
  const then = new Date(iso).getTime();
  return Math.floor((now.getTime() - then) / (1000 * 60 * 60 * 24));
}

export function daysArchived(job: Job, now: Date): number {
  if (!job.archivedAt) {
    return 0;
  }
  return daysSince(job.archivedAt, now);
}

export function isEligibleForDeletion(job: Job, now: Date): boolean {
  if (job.status !== "archived" || !job.archivedAt) {
    return false;
  }
  if (isPermanentArchive(job)) {
    return false;
  }
  return daysArchived(job, now) >= ARCHIVE_EXPIRY_DAYS;
}

export function shouldWarnBeforeDeletion(job: Job, now: Date): boolean {
  if (job.status !== "archived" || !job.archivedAt || isPermanentArchive(job)) {
    return false;
  }
  const days = daysArchived(job, now);
  return days >= PRE_DELETION_WARNING_DAY && days < ARCHIVE_EXPIRY_DAYS;
}

export function lastActivityAt(job: Job): string {
  const timestamps = Object.values(job.stageHistory);
  if (timestamps.length === 0) {
    return job.submissionDate;
  }
  return timestamps.sort().at(-1) ?? job.submissionDate;
}

export function isStaleActiveJob(job: Job, now: Date): boolean {
  if (job.status !== "active") {
    return false;
  }
  return daysSince(lastActivityAt(job), now) >= STALE_JOB_DAYS;
}
