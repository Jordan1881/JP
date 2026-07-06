import type { JobImportResult } from "@jp/shared-types";
import type { JobRepository } from "../../modules/job-repository/index.js";

/** Repository surface used by job workflow use-cases. */
export type JobRepositoryPort = Pick<
  JobRepository,
  | "list"
  | "create"
  | "getById"
  | "patch"
  | "archiveManual"
  | "archiveNoResponse"
  | "restore"
  | "deletePermanent"
>;

/** Import agent surface — swap for mocks in unit tests. */
export interface JobImportAgentPort {
  importFromText(text: string): Promise<JobImportResult>;
  importFromUrl(url: string): Promise<JobImportResult>;
}
