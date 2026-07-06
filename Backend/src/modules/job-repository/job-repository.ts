import { randomUUID } from "node:crypto";
import {
  searchAndFilterJobs,
  type CreateJobInput,
  type Job,
  type ListJobsQuery,
  type PatchJobInput,
} from "@jp/shared-types";
import {
  applyStageChange,
  createInitialStageState,
  SUBMITTED_RESUME_STAGE,
  type TerminalStageEvent,
} from "../stage-pipeline-manager/index.js";
import {
  archiveJob,
  archiveReasonForTerminalStage,
  restoreJob,
} from "../archive-lifecycle-manager/index.js";
import type { UserPreferencesRepository } from "../user-preferences/user-preferences.js";
import type { JobStore } from "./types.js";

function optionalTrim(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export class JobRepository {
  private terminalStageListeners: Array<(event: TerminalStageEvent) => void> =
    [];

  constructor(
    private readonly store: JobStore,
    private readonly preferences?: UserPreferencesRepository,
  ) {}

  onTerminalStage(listener: (event: TerminalStageEvent) => void): () => void {
    this.terminalStageListeners.push(listener);
    return () => {
      this.terminalStageListeners = this.terminalStageListeners.filter(
        (item) => item !== listener,
      );
    };
  }

  private emitTerminalStage(event: TerminalStageEvent): void {
    for (const listener of this.terminalStageListeners) {
      listener(event);
    }
  }

  async getById(userId: string, jobId: string): Promise<Job | null> {
    return this.store.findById(jobId, userId);
  }

  async create(userId: string, input: CreateJobInput): Promise<Job> {
    const title = input.title.trim();
    const company = input.company.trim();

    if (!title) {
      throw new Error("Job title is required");
    }
    if (!company) {
      throw new Error("Company is required");
    }
    if (!input.submissionDate) {
      throw new Error("Submission date is required");
    }

    const stageState = createInitialStageState(input.submissionDate);
    const submissionDate = stageState.stageHistory[SUBMITTED_RESUME_STAGE]!;
    const now = new Date().toISOString();

    const job: Job = {
      id: randomUUID(),
      userId,
      title,
      company,
      jobNumber: optionalTrim(input.jobNumber),
      url: optionalTrim(input.url),
      description: optionalTrim(input.description),
      notes: optionalTrim(input.notes),
      submissionDate,
      currentStage: stageState.currentStage,
      stageHistory: stageState.stageHistory,
      status: "active",
      lastUpdatedAt: now,
    };

    return this.store.insert(job);
  }

  async list(userId: string, query: ListJobsQuery = {}): Promise<Job[]> {
    const jobs = await this.store.listByUser(userId);
    return searchAndFilterJobs(jobs, query);
  }

  async listActive(userId: string, sortOrder: "asc" | "desc" = "desc"): Promise<Job[]> {
    return this.list(userId, { status: "active", sortOrder });
  }

  async patch(
    userId: string,
    jobId: string,
    input: PatchJobInput,
  ): Promise<{ job: Job; terminalStageEvent?: TerminalStageEvent }> {
    const existing = await this.store.findById(jobId, userId);
    if (!existing) {
      throw new Error("Job not found");
    }

    let job = existing;

    if (input.notes !== undefined) {
      const notes = input.notes.trim();
      job = {
        ...job,
        notes: notes || undefined,
        lastUpdatedAt: new Date().toISOString(),
      };
    }

    if (input.coverLetter !== undefined) {
      job = {
        ...job,
        coverLetter: input.coverLetter.trim() || undefined,
        lastUpdatedAt: new Date().toISOString(),
      };
    }

    if (input.announcement !== undefined) {
      job = {
        ...job,
        announcement: input.announcement.trim() || undefined,
        lastUpdatedAt: new Date().toISOString(),
      };
    }

    let terminalStageEvent: TerminalStageEvent | undefined;

    if (input.stage !== undefined) {
      const stageList = this.preferences
        ? (await this.preferences.getOrCreate(userId)).stageList
        : undefined;
      const result = applyStageChange(job, input.stage, undefined, stageList);
      job = result.job;
      terminalStageEvent = result.terminalStageEvent;
      if (terminalStageEvent) {
        this.emitTerminalStage(terminalStageEvent);
        job = archiveJob(
          job,
          archiveReasonForTerminalStage(terminalStageEvent.stage),
          job.lastUpdatedAt,
        );
      }
    }

    const updated = await this.store.update(job);
    return { job: updated, terminalStageEvent };
  }

  async archiveManual(userId: string, jobId: string): Promise<Job> {
    const existing = await this.store.findById(jobId, userId);
    if (!existing) {
      throw new Error("Job not found");
    }
    if (existing.status === "archived") {
      throw new Error("Job is already archived");
    }
    return this.store.update(archiveJob(existing, "manual"));
  }

  async archiveNoResponse(userId: string, jobId: string): Promise<Job> {
    const existing = await this.store.findById(jobId, userId);
    if (!existing) {
      throw new Error("Job not found");
    }
    return this.store.update(archiveJob(existing, "no_response"));
  }

  async restore(userId: string, jobId: string): Promise<Job> {
    const existing = await this.store.findById(jobId, userId);
    if (!existing) {
      throw new Error("Job not found");
    }
    if (existing.status !== "archived") {
      throw new Error("Job is not archived");
    }
    return this.store.update(restoreJob(existing));
  }

  async deletePermanent(userId: string, jobId: string): Promise<void> {
    const deleted = await this.store.delete(jobId, userId);
    if (!deleted) {
      throw new Error("Job not found");
    }
  }

  async deleteExpired(userId: string, jobIds: string[]): Promise<number> {
    let count = 0;
    for (const jobId of jobIds) {
      const job = await this.store.findById(jobId, userId);
      if (job) {
        await this.store.delete(jobId, userId);
        count += 1;
      }
    }
    return count;
  }
}
