import type { AppNotification, Job, UserPreferences } from "@jp/shared-types";
import {
  isEligibleForDeletion,
  isStaleActiveJob,
  shouldWarnBeforeDeletion,
  STALE_JOB_DAYS,
} from "../archive-lifecycle-manager/index.js";
import type { CreateNotificationInput } from "../notification-center/index.js";

export interface StalenessSweepResult {
  staleNotifications: CreateNotificationInput[];
  preDeletionWarnings: CreateNotificationInput[];
  jobsToDelete: string[];
}

function hasOpenStaleNotification(
  notifications: AppNotification[],
  jobId: string,
  now: Date,
): boolean {
  const existing = notifications.find(
    (item) => item.type === "stale_job" && item.jobId === jobId,
  );
  if (!existing) {
    return false;
  }
  if (existing.read) {
    return false;
  }
  const remindedAt = existing.lastRemindedAt ?? existing.createdAt;
  const days = Math.floor(
    (now.getTime() - new Date(remindedAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  return days < STALE_JOB_DAYS;
}

function hasPreDeletionWarning(
  notifications: AppNotification[],
  jobId: string,
): boolean {
  return notifications.some(
    (item) => item.type === "pre_deletion_warning" && item.jobId === jobId,
  );
}

export function runStalenessSweep(input: {
  jobs: Job[];
  notifications: AppNotification[];
  preferences: UserPreferences;
  now?: Date;
}): StalenessSweepResult {
  const now = input.now ?? new Date();
  const staleNotifications: CreateNotificationInput[] = [];
  const preDeletionWarnings: CreateNotificationInput[] = [];
  const jobsToDelete: string[] = [];

  for (const job of input.jobs) {
    if (job.userId !== input.preferences.userId) {
      continue;
    }

    if (isEligibleForDeletion(job, now)) {
      jobsToDelete.push(job.id);
      continue;
    }

    if (
      input.preferences.preDeletionWarningsEnabled &&
      shouldWarnBeforeDeletion(job, now) &&
      !hasPreDeletionWarning(input.notifications, job.id)
    ) {
      preDeletionWarnings.push({
        userId: job.userId,
        type: "pre_deletion_warning",
        jobId: job.id,
        title: "Archive deletion soon",
        message: `${job.title} at ${job.company} will be permanently deleted in 5 days.`,
      });
    }

    if (
      input.preferences.staleNotificationsEnabled &&
      isStaleActiveJob(job, now) &&
      !hasOpenStaleNotification(input.notifications, job.id, now)
    ) {
      staleNotifications.push({
        userId: job.userId,
        type: "stale_job",
        jobId: job.id,
        title: "Application needs attention",
        message: `${job.title} at ${job.company} has had no updates in ${STALE_JOB_DAYS}+ days.`,
      });
    }
  }

  return { staleNotifications, preDeletionWarnings, jobsToDelete };
}
