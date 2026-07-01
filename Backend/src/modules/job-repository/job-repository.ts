import { randomUUID } from "node:crypto";
import type { CreateJobInput, Job } from "@jp/shared-types";
import { createInitialStageState, SUBMITTED_RESUME_STAGE } from "../stage-pipeline-manager/index.js";
import type { JobStore, ListActiveJobsParams } from "./types.js";

function optionalTrim(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export class JobRepository {
  constructor(private readonly store: JobStore) {}

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
}
