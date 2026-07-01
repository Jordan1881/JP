import type { CreateJobInput, Job, ListJobsQuery } from "@jp/shared-types";

export interface JobStore {
  insert(job: Job): Promise<Job>;
  update(job: Job): Promise<Job>;
  delete(id: string, userId: string): Promise<boolean>;
  findById(id: string, userId: string): Promise<Job | null>;
  listByUser(userId: string): Promise<Job[]>;
  listUserIds(): Promise<string[]>;
  deleteByUser(userId: string): Promise<void>;
}

export interface ListActiveJobsParams {
  userId: string;
  sortOrder?: "asc" | "desc";
}

export type { CreateJobInput, Job, ListJobsQuery };
