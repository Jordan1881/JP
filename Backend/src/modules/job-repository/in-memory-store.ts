import type { Job } from "@jp/shared-types";
import type { JobStore } from "./types.js";

export class InMemoryJobStore implements JobStore {
  private readonly jobs = new Map<string, Job>();

  async insert(job: Job): Promise<Job> {
    this.jobs.set(job.id, structuredClone(job));
    return structuredClone(job);
  }

  async update(job: Job): Promise<Job> {
    if (!this.jobs.has(job.id)) {
      throw new Error("Job not found");
    }
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

  async deleteByUser(userId: string): Promise<void> {
    for (const [id, job] of this.jobs) {
      if (job.userId === userId) {
        this.jobs.delete(id);
      }
    }
  }

  clear(): void {
    this.jobs.clear();
  }
}
