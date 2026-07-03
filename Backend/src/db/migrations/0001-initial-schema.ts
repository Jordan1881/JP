import type { Migration } from "../migrate.js";

/**
 * Initial schema for all v1 entities (issue #40).
 *
 * Mirrors @jp/shared-types exactly:
 * - Job / StageHistory / ArchiveReason  → jobs
 * - UserAccount                         → user_accounts
 * - CareerProfile                       → career_profiles
 * - UserPreferences                     → user_preferences
 * - AppNotification                     → notifications
 *
 * user_id is the Cognito sub (text). jobs.user_id has no FK to user_accounts:
 * Cognito is the identity authority and a job may be created before the
 * account row is finalized. Notifications cascade with their job.
 */
export const initialSchema: Migration = {
  id: "0001-initial-schema",
  up: `
    CREATE TABLE user_accounts (
      user_id            text PRIMARY KEY,
      name               text NOT NULL,
      email              text NOT NULL,
      photo_url          text,
      terms_version      text,
      terms_accepted_at  timestamptz
    );

    CREATE TABLE jobs (
      id               text PRIMARY KEY,
      user_id          text NOT NULL,
      title            text NOT NULL,
      company          text NOT NULL,
      job_number       text,
      url              text,
      description      text,
      notes            text,
      submission_date  timestamptz NOT NULL,
      current_stage    text NOT NULL,
      stage_history    jsonb NOT NULL DEFAULT '{}'::jsonb,
      status           text NOT NULL CHECK (status IN ('active', 'archived')),
      archive_reason   text CHECK (
        archive_reason IN ('manual', 'no_response', 'accepted', 'rejected')
      ),
      archived_at      timestamptz,
      last_updated_at  timestamptz NOT NULL,
      cover_letter     text,
      announcement     text
    );

    -- List queries: by user + status, sorted by last-updated, filtered by stage.
    CREATE INDEX jobs_user_status_idx ON jobs (user_id, status);
    CREATE INDEX jobs_user_updated_idx ON jobs (user_id, last_updated_at DESC);
    CREATE INDEX jobs_user_stage_idx ON jobs (user_id, current_stage);

    CREATE TABLE career_profiles (
      user_id                 text PRIMARY KEY,
      tech_stack              jsonb NOT NULL DEFAULT '[]'::jsonb,
      target_roles            jsonb NOT NULL DEFAULT '[]'::jsonb,
      seniority               text NOT NULL DEFAULT '',
      years_of_experience     double precision NOT NULL DEFAULT 0,
      location_preference     text NOT NULL DEFAULT '',
      remote_preference       text NOT NULL DEFAULT '',
      salary_expectations     text NOT NULL DEFAULT '',
      notable_projects        text NOT NULL DEFAULT '',
      soft_skills             text NOT NULL DEFAULT '',
      career_narrative        text NOT NULL DEFAULT '',
      interview_completed_at  timestamptz
    );

    CREATE TABLE user_preferences (
      user_id                        text PRIMARY KEY,
      stale_notifications_enabled    boolean NOT NULL DEFAULT true,
      pre_deletion_warnings_enabled  boolean NOT NULL DEFAULT true,
      stage_list                     jsonb NOT NULL DEFAULT '[]'::jsonb
    );

    CREATE TABLE notifications (
      id                text PRIMARY KEY,
      user_id           text NOT NULL,
      type              text NOT NULL CHECK (
        type IN ('stale_job', 'pre_deletion_warning')
      ),
      job_id            text NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
      title             text NOT NULL,
      message           text NOT NULL,
      read              boolean NOT NULL DEFAULT false,
      created_at        timestamptz NOT NULL,
      last_reminded_at  timestamptz
    );

    CREATE INDEX notifications_user_created_idx
      ON notifications (user_id, created_at DESC);
    CREATE INDEX notifications_job_idx ON notifications (job_id);
  `,
};
