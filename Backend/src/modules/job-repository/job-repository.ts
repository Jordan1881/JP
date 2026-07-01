import { randomUUID } from "node:crypto";
import type { CreateJobInput, Job, PatchJobInput } from "@jp/shared-types";
import {
  applyStageChange,
  createInitialStageState,
  SUBMITTED_RESUME_STAGE,
  type TerminalStageEvent,
} from "../stage-pipeline-manager/index.js";
import type { JobStore, ListActiveJobsParams } from "./types.js";

function optionalTrim(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export class JobRepository {
  private terminalStageListeners: Array<(event: TerminalStageEvent) => void> =
    [];

  constructor(private readonly store: JobStore) {}

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

  async listActive(params: ListActiveJobsParams): Promise<Job[]> {
    const sortOrder = params.sortOrder ?? "desc";
    const jobs = await this.store.listByUser(params.userId);
    const active = jobs.filter((job) => job.status === "active");

    return active.sort((left, right) => {
      const comparison = left.lastUpdatedAt.localeCompare(right.lastUpdatedAt);
      return sortOrder === "desc" ? -comparison : comparison;
    });
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

    let terminalStageEvent: TerminalStageEvent | undefined;

    if (input.stage !== undefined) {
      const result = applyStageChange(job, input.stage);
      job = result.job;
      terminalStageEvent = result.terminalStageEvent;
      if (terminalStageEvent) {
        this.emitTerminalStage(terminalStageEvent);
      }
    }

    const updated = await this.store.update(job);
    return { job: updated, terminalStageEvent };
  }
}
