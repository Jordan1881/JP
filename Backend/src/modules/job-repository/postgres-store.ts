import type pg from "pg";
import type { ArchiveReason, Job, JobStatus, StageHistory } from "@jp/shared-types";
import type { JobStore } from "./types.js";

interface JobRow {
  id: string;
  user_id: string;
  title: string;
  company: string;
  job_number: string | null;
  url: string | null;
  description: string | null;
  notes: string | null;
  submission_date: Date;
  current_stage: string;
  stage_history: StageHistory;
  status: JobStatus;
  archive_reason: ArchiveReason | null;
  archived_at: Date | null;
  last_updated_at: Date;
  cover_letter: string | null;
  announcement: string | null;
}

function rowToJob(row: JobRow): Job {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    company: row.company,
    jobNumber: row.job_number ?? undefined,
    url: row.url ?? undefined,
    description: row.description ?? undefined,
    notes: row.notes ?? undefined,
    submissionDate: row.submission_date.toISOString(),
    currentStage: row.current_stage,
    stageHistory: row.stage_history,
    status: row.status,
    archiveReason: row.archive_reason ?? undefined,
    archivedAt: row.archived_at?.toISOString(),
    lastUpdatedAt: row.last_updated_at.toISOString(),
    coverLetter: row.cover_letter ?? undefined,
    announcement: row.announcement ?? undefined,
  };
}

function jobParams(job: Job): unknown[] {
  return [
    job.id,
    job.userId,
    job.title,
    job.company,
    job.jobNumber ?? null,
    job.url ?? null,
    job.description ?? null,
    job.notes ?? null,
    job.submissionDate,
    job.currentStage,
    JSON.stringify(job.stageHistory),
    job.status,
    job.archiveReason ?? null,
    job.archivedAt ?? null,
    job.lastUpdatedAt,
    job.coverLetter ?? null,
    job.announcement ?? null,
  ];
}

const RETURNING = `
  RETURNING id, user_id, title, company, job_number, url, description, notes,
            submission_date, current_stage, stage_history, status,
            archive_reason, archived_at, last_updated_at, cover_letter,
            announcement
`;

export class PostgresJobStore implements JobStore {
  constructor(private readonly pool: pg.Pool) {}

  async insert(job: Job): Promise<Job> {
    const { rows } = await this.pool.query<JobRow>(
      `INSERT INTO jobs (
         id, user_id, title, company, job_number, url, description, notes,
         submission_date, current_stage, stage_history, status,
         archive_reason, archived_at, last_updated_at, cover_letter,
         announcement
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
               $15, $16, $17)
       ${RETURNING}`,
      jobParams(job),
    );
    return rowToJob(rows[0]!);
  }

  async update(job: Job): Promise<Job> {
    const { rows } = await this.pool.query<JobRow>(
      `UPDATE jobs SET
         user_id = $2, title = $3, company = $4, job_number = $5, url = $6,
         description = $7, notes = $8, submission_date = $9,
         current_stage = $10, stage_history = $11, status = $12,
         archive_reason = $13, archived_at = $14, last_updated_at = $15,
         cover_letter = $16, announcement = $17
       WHERE id = $1
       ${RETURNING}`,
      jobParams(job),
    );
    if (rows.length === 0) {
      throw new Error("Job not found");
    }
    return rowToJob(rows[0]!);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM jobs WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findById(id: string, userId: string): Promise<Job | null> {
    const { rows } = await this.pool.query<JobRow>(
      "SELECT * FROM jobs WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return rows[0] ? rowToJob(rows[0]) : null;
  }

  async listByUser(userId: string): Promise<Job[]> {
    const { rows } = await this.pool.query<JobRow>(
      "SELECT * FROM jobs WHERE user_id = $1 ORDER BY last_updated_at DESC",
      [userId],
    );
    return rows.map(rowToJob);
  }

  async listUserIds(): Promise<string[]> {
    const { rows } = await this.pool.query<{ user_id: string }>(
      "SELECT DISTINCT user_id FROM jobs",
    );
    return rows.map((row) => row.user_id);
  }

  async deleteByUser(userId: string): Promise<void> {
    await this.pool.query("DELETE FROM jobs WHERE user_id = $1", [userId]);
  }
}
