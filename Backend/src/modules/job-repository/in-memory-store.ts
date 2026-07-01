import type { Job } from "@jp/shared-types";
import type { JobStore } from "./types.js";

export class InMemoryJobStore implements JobStore {
  private readonly jobs = new Map<string, Job>();

  async insert(job: Job): Promise<Job> {
    this.jobs.set(job.id, structuredClone(job));
    return structuredClone(job);
  }

  async findById(id: string, userId: string): Promise<Job | null> {
    const job = this.jobs.get(id);
    if (!job || job.userId !== userId) {
      return null;
    }
    return structuredClone(job);
  }

  async listByUser(userId: string): Promise<Job[]> {
    return [...this.jobs.values()]
      .filter((job) => job.userId === userId)
      .map((job) => structuredClone(job));
  }

  clear(): void {
    this.jobs.clear();
  }
}
