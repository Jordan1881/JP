import type { CreateJobInput, Job } from "@jp/shared-types";

export interface JobStore {
  insert(job: Job): Promise<Job>;
  findById(id: string, userId: string): Promise<Job | null>;
  listByUser(userId: string): Promise<Job[]>;
  deleteByUser(userId: string): Promise<void>;
}

export interface ListActiveJobsParams {
  userId: string;
  sortOrder?: "asc" | "desc";
}

export type { CreateJobInput, Job };
